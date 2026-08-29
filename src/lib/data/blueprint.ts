import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDemoAssessmentByKey } from "@/lib/data/moduleContent";
import { getZoneOfInvestmentData, type ZoneOfInvestmentData } from "@/lib/data/zoneOfInvestment";
import { getDelegationCandidates } from "@/lib/data/delegation";
import { getArchitectureData, type ArchitectureData } from "@/lib/data/architecture";
import type { LeverageLevel } from "@/types/database";

export interface BlueprintAnswer {
  prompt: string;
  answer: string;
}

export interface BlueprintDelegationOpportunity {
  label: string;
  selectionOrder: number;
  /** Only present once architecture has been revealed for this session --
   * hidden before then, same as everywhere else this classification appears
   * (brief section 9's leverage-mapping reveal). */
  leverageLevel: LeverageLevel | null;
}

export interface BlueprintData {
  session: { name: string; organization: string | null };
  modules: { key: string; name: string; state: string; requiresLiveWorkshop: boolean }[];
  operatingAltitude: BlueprintAnswer[];
  zone: ZoneOfInvestmentData;
  delegation: {
    readinessResult: { overallResult: string | null; interpretation: string | null } | null;
    priorityOpportunities: BlueprintDelegationOpportunity[];
  };
  architecture: ArchitectureData;
}

/**
 * Deliberately takes no auth dependency of its own -- authorization is the
 * caller's job (both callers resolve `participantSessionId` through a
 * query already scoped by RLS to "the owning participant or an admin"
 * before reaching here: the dashboard page via getParticipantDashboard,
 * the PDF route via its own participant_sessions lookup). Every query below
 * is still individually RLS-scoped, so an unauthorized participantSessionId
 * simply comes back empty rather than needing a redundant check here.
 */
export async function getBlueprintData(
  sessionId: string,
  participantSessionId: string,
): Promise<BlueprintData | null> {
  const supabase = await createServerSupabaseClient();

  const [{ data: session }, { data: modules }, { data: progress }] = await Promise.all([
    supabase.from("sessions").select("name, organization, architecture_revealed").eq("id", sessionId).maybeSingle(),
    supabase.from("modules").select("id, key, name, sort_order, requires_live_workshop").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("participant_module_progress").select("module_id, status").eq("participant_session_id", participantSessionId),
  ]);

  if (!session || !modules) return null;

  const statusByModule = new Map((progress ?? []).map((p) => [p.module_id, p.status]));

  const [operatingAltitudeAssessment, zone, delegationCandidates, architecture] = await Promise.all([
    getDemoAssessmentByKey("dev_demo_operating_altitude", participantSessionId),
    getZoneOfInvestmentData(participantSessionId),
    getDelegationCandidates(participantSessionId),
    getArchitectureData(sessionId, participantSessionId),
  ]);

  const operatingAltitude: BlueprintAnswer[] = (operatingAltitudeAssessment?.questions ?? [])
    .filter((q) => q.existingAnswer !== null && q.existingAnswer !== undefined && q.existingAnswer !== "")
    .map((q) => {
      let answer: string;
      if (q.type === "multiple_choice") {
        answer = q.options.find((o) => o.value === q.existingAnswer)?.label ?? String(q.existingAnswer);
      } else {
        answer = String(q.existingAnswer);
      }
      return { prompt: q.prompt, answer };
    });

  let priorityOpportunities: BlueprintDelegationOpportunity[] = delegationCandidates.currentSelections.map((s) => ({
    label: s.label,
    selectionOrder: s.selectionOrder,
    leverageLevel: null,
  }));

  if (session.architecture_revealed && priorityOpportunities.length > 0) {
    const { data: withLevels } = await supabase
      .from("priority_delegation_opportunities")
      .select("responsibility_id, leverage_level_snapshot")
      .eq("participant_session_id", participantSessionId);
    const levelByResponsibilityId = new Map((withLevels ?? []).map((w) => [w.responsibility_id, w.leverage_level_snapshot]));
    priorityOpportunities = delegationCandidates.currentSelections.map((s) => ({
      label: s.label,
      selectionOrder: s.selectionOrder,
      leverageLevel: (levelByResponsibilityId.get(s.responsibilityId) as LeverageLevel | undefined) ?? null,
    }));
  }

  return {
    session: { name: session.name, organization: session.organization },
    modules: modules.map((m) => ({
      key: m.key,
      name: m.name,
      state: (statusByModule.get(m.id) as string | undefined) ?? "not_started",
      requiresLiveWorkshop: m.requires_live_workshop,
    })),
    operatingAltitude,
    zone,
    delegation: {
      readinessResult: delegationCandidates.readinessResult
        ? {
            overallResult: delegationCandidates.readinessResult.overallResult,
            interpretation: delegationCandidates.readinessResult.interpretation,
          }
        : null,
      priorityOpportunities,
    },
    architecture,
  };
}
