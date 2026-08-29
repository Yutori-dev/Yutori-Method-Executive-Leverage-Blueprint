import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getZoneOfInvestmentData, type ZoneOfInvestmentData } from "@/lib/data/zoneOfInvestment";
import { getExecutiveLeverageDiagnosticData, type ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";
import { getDelegationCandidates } from "@/lib/data/delegation";
import { getArchitectureData, type ArchitectureData } from "@/lib/data/architecture";
import type { LeverageLevel } from "@/types/database";

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
  executiveLeverageProfile: ExecutiveLeverageProfileResult | null;
  zone: ZoneOfInvestmentData;
  delegation: {
    readinessResult: { overallResult: string | null; interpretation: string | null } | null;
    priorityOpportunities: BlueprintDelegationOpportunity[];
  };
  architecture: ArchitectureData;
  followUpRequested: boolean;
  reflections: { whiteWhale: string | null; successVision: string | null; successVisionFollowup: string | null };
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

  const [{ data: session }, { data: modules }, { data: progress }, { data: followUp }, { data: reflectionRow }] =
    await Promise.all([
    supabase.from("sessions").select("name, organization, architecture_revealed").eq("id", sessionId).maybeSingle(),
    supabase.from("modules").select("id, key, name, sort_order, requires_live_workshop").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("participant_module_progress").select("module_id, status").eq("participant_session_id", participantSessionId),
    supabase.from("follow_up_interests").select("id").eq("participant_session_id", participantSessionId).maybeSingle(),
    supabase
      .from("participant_reflections")
      .select("white_whale, success_vision, success_vision_white_whale_followup")
      .eq("participant_session_id", participantSessionId)
      .maybeSingle(),
  ]);

  if (!session || !modules) return null;

  const statusByModule = new Map((progress ?? []).map((p) => [p.module_id, p.status]));

  const [diagnostic, zone, delegationCandidates, architecture] = await Promise.all([
    getExecutiveLeverageDiagnosticData(participantSessionId),
    getZoneOfInvestmentData(sessionId, participantSessionId),
    getDelegationCandidates(participantSessionId),
    getArchitectureData(sessionId, participantSessionId),
  ]);

  // leverage_level_snapshot is already in delegationCandidates.currentSelections
  // (getDelegationCandidates fetches it unconditionally, it's cheap) -- no
  // separate query needed, just decide here whether to expose it, same as
  // everywhere else this classification appears.
  const priorityOpportunities: BlueprintDelegationOpportunity[] = delegationCandidates.currentSelections.map((s) => ({
    label: s.label,
    selectionOrder: s.selectionOrder,
    leverageLevel: session.architecture_revealed ? s.leverageLevelSnapshot : null,
  }));

  return {
    session: { name: session.name, organization: session.organization },
    modules: modules.map((m) => ({
      key: m.key,
      name: m.name,
      state: (statusByModule.get(m.id) as string | undefined) ?? "not_started",
      requiresLiveWorkshop: m.requires_live_workshop,
    })),
    executiveLeverageProfile: diagnostic.result,
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
    followUpRequested: !!followUp,
    reflections: {
      whiteWhale: reflectionRow?.white_whale ?? null,
      successVision: reflectionRow?.success_vision ?? null,
      successVisionFollowup: reflectionRow?.success_vision_white_whale_followup ?? null,
    },
  };
}
