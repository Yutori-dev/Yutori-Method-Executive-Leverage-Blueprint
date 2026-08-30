import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getZoneOfInvestmentData, type ZoneOfInvestmentData } from "@/lib/data/zoneOfInvestment";
import { getExecutiveLeverageDiagnosticData, type ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";
import { getDelegationCandidates } from "@/lib/data/delegation";
import { getArchitectureData, type ArchitectureData } from "@/lib/data/architecture";
import type { CurrentSupportFlags } from "@/lib/currentSupportLabels";
import {
  getDelegationBeliefsData,
  getPrimaryDelegationBarriers,
  getPriorityOwnershipTransferOpportunity,
  type DelegationBarrier,
} from "@/lib/data/delegationBeliefs";
import { getExecutiveSupportAuditData, getExecutiveSupportAuditSummary } from "@/lib/data/executiveSupportAudit";
import type { LeverageLevel, SelfIdentification } from "@/types/database";

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
  participant: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    currentRoleTitle: string | null;
    currentSupport: CurrentSupportFlags;
  };
  modules: { key: string; name: string; state: string; requiresLiveWorkshop: boolean }[];
  executiveLeverageProfile: ExecutiveLeverageProfileResult | null;
  selfIdentification: SelfIdentification | null;
  zone: ZoneOfInvestmentData;
  delegation: {
    primaryBarriers: DelegationBarrier[];
    priorityOwnershipTransferOpportunity: { label: string; interpretation: string } | null;
    priorityOpportunities: BlueprintDelegationOpportunity[];
  };
  executiveSupportAudit: {
    primary: { layer: LeverageLevel; interpretation: string }[];
    secondary: { layer: LeverageLevel; interpretation: string }[];
    noSecondaryCopy: string | null;
  } | null;
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

  const [{ data: session }, { data: modules }, { data: progress }, { data: followUp }, { data: reflectionRow }, { data: participantSession }] =
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
    supabase
      .from("participant_sessions")
      .select(
        "self_identification, participants(first_name, last_name, company_name, current_role_title, current_support_personal_assistant, current_support_admin_or_va, current_support_executive_assistant, current_support_senior_executive_assistant, current_support_head_of_operations, current_support_chief_of_staff, current_support_chief_integrator, current_support_coo, current_support_other, current_support_other_text, current_support_none)",
      )
      .eq("id", participantSessionId)
      .maybeSingle(),
  ]);

  if (!session || !modules) return null;

  const participantRow = participantSession?.participants as unknown as {
    first_name: string;
    last_name: string;
    company_name: string | null;
    current_role_title: string | null;
    current_support_personal_assistant: boolean;
    current_support_admin_or_va: boolean;
    current_support_executive_assistant: boolean;
    current_support_senior_executive_assistant: boolean;
    current_support_head_of_operations: boolean;
    current_support_chief_of_staff: boolean;
    current_support_chief_integrator: boolean;
    current_support_coo: boolean;
    current_support_other: boolean;
    current_support_other_text: string | null;
    current_support_none: boolean;
  } | null;

  const statusByModule = new Map((progress ?? []).map((p) => [p.module_id, p.status]));

  const [diagnostic, zone, delegationCandidates, architecture, delegationBeliefsData, executiveSupportAuditData] =
    await Promise.all([
      getExecutiveLeverageDiagnosticData(participantSessionId),
      getZoneOfInvestmentData(sessionId, participantSessionId),
      getDelegationCandidates(participantSessionId),
      getArchitectureData(sessionId, participantSessionId),
      getDelegationBeliefsData(participantSessionId),
      getExecutiveSupportAuditData(participantSessionId),
    ]);

  const priorityOwnershipTransferOpportunity = delegationBeliefsData
    ? getPriorityOwnershipTransferOpportunity(delegationBeliefsData)
    : null;

  const executiveSupportAudit = executiveSupportAuditData ? getExecutiveSupportAuditSummary(executiveSupportAuditData) : null;

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
    participant: {
      firstName: participantRow?.first_name ?? "",
      lastName: participantRow?.last_name ?? "",
      companyName: participantRow?.company_name ?? null,
      currentRoleTitle: participantRow?.current_role_title ?? null,
      currentSupport: {
        currentSupportPersonalAssistant: participantRow?.current_support_personal_assistant ?? false,
        currentSupportAdminOrVa: participantRow?.current_support_admin_or_va ?? false,
        currentSupportExecutiveAssistant: participantRow?.current_support_executive_assistant ?? false,
        currentSupportSeniorExecutiveAssistant: participantRow?.current_support_senior_executive_assistant ?? false,
        currentSupportHeadOfOperations: participantRow?.current_support_head_of_operations ?? false,
        currentSupportChiefOfStaff: participantRow?.current_support_chief_of_staff ?? false,
        currentSupportChiefIntegrator: participantRow?.current_support_chief_integrator ?? false,
        currentSupportCoo: participantRow?.current_support_coo ?? false,
        currentSupportOther: participantRow?.current_support_other ?? false,
        currentSupportOtherText: participantRow?.current_support_other_text ?? null,
        currentSupportNone: participantRow?.current_support_none ?? false,
      },
    },
    modules: modules.map((m) => ({
      key: m.key,
      name: m.name,
      state: (statusByModule.get(m.id) as string | undefined) ?? "not_started",
      requiresLiveWorkshop: m.requires_live_workshop,
    })),
    executiveLeverageProfile: diagnostic.result,
    selfIdentification: (participantSession?.self_identification as SelfIdentification | null) ?? null,
    zone,
    delegation: {
      primaryBarriers: delegationBeliefsData ? getPrimaryDelegationBarriers(delegationBeliefsData) : [],
      priorityOwnershipTransferOpportunity: priorityOwnershipTransferOpportunity
        ? { label: priorityOwnershipTransferOpportunity.label, interpretation: priorityOwnershipTransferOpportunity.interpretation }
        : null,
      priorityOpportunities,
    },
    executiveSupportAudit,
    architecture,
    followUpRequested: !!followUp,
    reflections: {
      whiteWhale: reflectionRow?.white_whale ?? null,
      successVision: reflectionRow?.success_vision ?? null,
      successVisionFollowup: reflectionRow?.success_vision_white_whale_followup ?? null,
    },
  };
}
