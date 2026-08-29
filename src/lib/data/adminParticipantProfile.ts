import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel, MacroZone, RatingLevel, ArchitectureReaction } from "@/types/database";

export interface AdminProfileAnswer {
  prompt: string;
  answer: string;
}

export interface AdminProfileResponsibility {
  label: string;
  competency: RatingLevel | null;
  passion: RatingLevel | null;
  matrixCell: string | null;
  macroZone: MacroZone | null;
  /** Unlike every participant-facing query, the admin coaching view is
   * meant to see this (brief section 17) -- it's simply never selected by
   * participant-facing code, not blocked by RLS. Null for content whose
   * hidden leverage classification hasn't been supplied yet (the new real
   * Zone of Investment responsibilities) -- a controlled-pending state,
   * not an error. */
  leverageLevel: LeverageLevel | null;
}

export interface AdminProfilePriority {
  label: string;
  selectionOrder: number;
  leverageLevelSnapshot: LeverageLevel | null;
}

export interface AdminParticipantProfile {
  participant: { firstName: string; lastName: string; email: string };
  enrollment: { completionState: string; startedAt: string | null; lastActiveAt: string };
  modules: { key: string; name: string; status: string }[];
  operatingAltitude: AdminProfileAnswer[];
  zoneOfInvestment: AdminProfileResponsibility[];
  delegation: {
    readinessResult: { overallResult: string | null; interpretation: string | null } | null;
    priorities: AdminProfilePriority[];
  };
  architecture: {
    revealed: boolean;
    primarySignalLeverageLevel: LeverageLevel | null;
    isTied: boolean;
    rationale: string | null;
    reaction: ArchitectureReaction | null;
    reactionNote: string | null;
  } | null;
}

export async function getAdminParticipantProfile(
  participantSessionId: string,
): Promise<AdminParticipantProfile | null> {
  const supabase = await createServerSupabaseClient();

  const { data: enrollment } = await supabase
    .from("participant_sessions")
    .select("participant_id, session_id, completion_state, started_at, last_active_at")
    .eq("id", participantSessionId)
    .maybeSingle();

  if (!enrollment) return null;

  const [{ data: participant }, { data: session }, { data: modules }, { data: progress }] = await Promise.all([
    supabase.from("participants").select("first_name, last_name, email").eq("id", enrollment.participant_id).maybeSingle(),
    supabase.from("sessions").select("architecture_revealed").eq("id", enrollment.session_id).maybeSingle(),
    supabase.from("modules").select("id, key, name").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("participant_module_progress").select("module_id, status").eq("participant_session_id", participantSessionId),
  ]);

  if (!participant || !session || !modules) return null;

  const statusByModule = new Map((progress ?? []).map((p) => [p.module_id, p.status]));

  const [
    { data: assessments },
    { data: responsibilityRows },
    { data: priorityRows },
    { data: recommendation },
  ] = await Promise.all([
    supabase.from("assessments").select("id, key, name").eq("key", "dev_demo_operating_altitude"),
    supabase
      .from("participant_responsibilities")
      .select("responsibility_id, competency, passion, matrix_cell, macro_zone, responsibilities(label, leverage_level)")
      .eq("participant_session_id", participantSessionId),
    supabase
      .from("priority_delegation_opportunities")
      .select("responsibility_id, selection_order, leverage_level_snapshot, responsibilities(label)")
      .eq("participant_session_id", participantSessionId)
      .order("selection_order", { ascending: true }),
    supabase
      .from("architecture_recommendations")
      .select("primary_signal_leverage_level, is_tied, rationale, reaction, reaction_note")
      .eq("participant_session_id", participantSessionId)
      .maybeSingle(),
  ]);

  let operatingAltitude: AdminProfileAnswer[] = [];
  if (assessments && assessments.length > 0) {
    const { data: questions } = await supabase
      .from("questions")
      .select("id, prompt, type")
      .eq("assessment_id", assessments[0].id)
      .order("sort_order", { ascending: true });
    const { data: responses } = await supabase
      .from("responses")
      .select("question_id, answer")
      .eq("participant_session_id", participantSessionId);
    const { data: options } = await supabase
      .from("answer_options")
      .select("question_id, label, value")
      .in("question_id", (questions ?? []).map((q) => q.id));

    const answerByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r.answer]));
    operatingAltitude = (questions ?? [])
      .filter((q) => answerByQuestion.has(q.id))
      .map((q) => {
        const raw = answerByQuestion.get(q.id);
        const label = (options ?? []).find((o) => o.question_id === q.id && o.value === raw)?.label;
        return { prompt: q.prompt, answer: label ?? String(raw) };
      });
  }

  const { data: delegationAssessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("key", "dev_demo_delegation_beliefs")
    .maybeSingle();

  let readinessResult: { overallResult: string | null; interpretation: string | null } | null = null;
  if (delegationAssessment) {
    const { data: result } = await supabase
      .from("assessment_results")
      .select("overall_result, interpretation")
      .eq("participant_session_id", participantSessionId)
      .eq("assessment_id", delegationAssessment.id)
      .maybeSingle();
    if (result) {
      readinessResult = { overallResult: result.overall_result, interpretation: result.interpretation };
    }
  }

  return {
    participant: { firstName: participant.first_name, lastName: participant.last_name, email: participant.email },
    enrollment: {
      completionState: enrollment.completion_state,
      startedAt: enrollment.started_at,
      lastActiveAt: enrollment.last_active_at,
    },
    modules: modules.map((m) => ({
      key: m.key,
      name: m.name,
      status: (statusByModule.get(m.id) as string | undefined) ?? "not_started",
    })),
    operatingAltitude,
    zoneOfInvestment: (responsibilityRows ?? []).map((r) => {
      const responsibility = r.responsibilities as unknown as { label: string; leverage_level: LeverageLevel | null };
      return {
        label: responsibility?.label ?? "[Removed responsibility]",
        competency: r.competency as RatingLevel | null,
        passion: r.passion as RatingLevel | null,
        matrixCell: r.matrix_cell,
        macroZone: r.macro_zone as MacroZone | null,
        leverageLevel: responsibility?.leverage_level ?? null,
      };
    }),
    delegation: {
      readinessResult,
      priorities: (priorityRows ?? []).map((p) => {
        const responsibility = p.responsibilities as unknown as { label: string };
        return {
          label: responsibility?.label ?? "[Removed responsibility]",
          selectionOrder: p.selection_order,
          leverageLevelSnapshot: p.leverage_level_snapshot as LeverageLevel | null,
        };
      }),
    },
    architecture: recommendation
      ? {
          revealed: session.architecture_revealed,
          primarySignalLeverageLevel: recommendation.primary_signal_leverage_level as LeverageLevel | null,
          isTied: recommendation.is_tied,
          rationale: recommendation.rationale,
          reaction: recommendation.reaction as ArchitectureReaction | null,
          reactionNote: recommendation.reaction_note,
        }
      : null,
  };
}
