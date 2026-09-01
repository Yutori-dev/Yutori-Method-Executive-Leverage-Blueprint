import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getZoneOfInvestmentData, type ZoneOfInvestmentData } from "@/lib/data/zoneOfInvestment";
import { getExecutiveLeverageDiagnosticData, type ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";
import { getDelegationCandidates } from "@/lib/data/delegation";
import { getArchitectureData, type ArchitectureData } from "@/lib/data/architecture";
import type { CurrentSupportFlags } from "@/lib/currentSupportLabels";
import { getDelegationBeliefsData, getPriorityOwnershipTransferOpportunity } from "@/lib/data/delegationBeliefs";
import { getExecutiveSupportAuditData, getExecutiveSupportAuditSummary } from "@/lib/data/executiveSupportAudit";
import { getExecutiveSupportArchitectureConfig } from "@/lib/data/executiveSupportArchitectureConfig";
import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";
import type { DelegationDomain } from "@/lib/delegationBeliefsConstants";
import {
  normalizeZonePercentages,
  classifyCapacityMapPattern,
  LEADERSHIP_WIRING_COPY,
  classifyBiggestImpediment,
  rankDelegationBeliefStatuses,
  selectHighestValueFocus,
  type DelegationStatusLabel,
} from "@/lib/blueprintCopy";
import type { LeverageLevel, SelfIdentification } from "@/types/database";

export interface BlueprintDelegationOpportunity {
  label: string;
  blueprintDescription: string | null;
  selectionOrder: number;
  /** Only present once the Priority Leverage Opportunities Reveal has
   * fired for this session -- hidden before then, same as everywhere else
   * this classification appears. */
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
  /** Section 01 -- Leadership Wiring: wiring + the locked short description
   * + pattern insight, resolved server-side from LEADERSHIP_WIRING_COPY.
   * Null only when self-identification hasn't been captured yet. */
  leadershipWiring: { wiring: SelfIdentification; shortDescription: string; patternInsight: string } | null;
  zone: ZoneOfInvestmentData;
  /** Section 01 -- Leadership Capacity Map Distribution: normalized
   * percentages (always sum to 100) + the deterministic pattern insight.
   * Null when nothing has been mapped yet. */
  capacityMap: { investmentPct: number; ambiguityPct: number; vulnerabilityPct: number; patternInsight: string } | null;
  delegation: {
    priorityOwnershipTransferOpportunity: { label: string; interpretation: string } | null;
    priorityOpportunities: BlueprintDelegationOpportunity[];
  };
  /** Section 01 -- Delegation Beliefs: relative bars (avg kept only for bar
   * width, never rendered as digits) + the Biggest Impediment
   * classification. Null until the assessment has produced a result. */
  delegationBeliefs: {
    dimensions: { domain: DelegationDomain; avg: number; statusLabel: DelegationStatusLabel | null }[];
    biggestImpediment: { kind: "single" | "two_way" | "none_dominant"; headline: string; interpretation: string };
  } | null;
  priorityLeverage: {
    revealed: boolean;
    pattern: { level: LeverageLevel; count: number }[];
  };
  executiveSupportAudit: {
    primary: { layer: LeverageLevel; interpretation: string }[];
    secondary: { layer: LeverageLevel; interpretation: string }[];
    noSecondaryCopy: string | null;
  } | null;
  architecture: ArchitectureData;
  architectureConfig: ExecutiveSupportArchitectureConfigInput | null;
  /** Section 04 -- Highest Value Focus: up to 4 Zone of Investment
   * responsibilities, ranked Genius > Strength > Potential, reusing
   * capacityMap.investmentPct rather than recomputing it. */
  highestValueFocus: { investmentPct: number; items: { responsibilityId: string; label: string; blueprintDescription: string | null }[] };
  followUpRequested: boolean;
  reflections: { whiteWhale: string | null; successVision: string | null; successVisionFollowup: string | null };
  /** Section 05 -- always "PREVIEW" for the current virtual product; models
   * the future live-workshop-completed state without requiring it now. */
  characterFitStatus: "PREVIEW" | "COMPLETE";
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
    supabase
      .from("sessions")
      .select("name, organization, architecture_revealed, priority_leverage_reveal_unlocked")
      .eq("id", sessionId)
      .maybeSingle(),
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
        "self_identification, participants(first_name, last_name, company_name, current_role_title, current_support_personal_assistant, current_support_admin_or_va, current_support_executive_assistant, current_support_senior_executive_assistant, current_support_head_of_operations, current_support_chief_of_staff, current_support_chief_integrator, current_support_coo, current_support_ai_automation, current_support_other, current_support_other_text, current_support_none)",
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
    current_support_ai_automation: boolean;
    current_support_other: boolean;
    current_support_other_text: string | null;
    current_support_none: boolean;
  } | null;

  const statusByModule = new Map((progress ?? []).map((p) => [p.module_id, p.status]));

  const [
    diagnostic,
    zone,
    delegationCandidates,
    architecture,
    delegationBeliefsData,
    executiveSupportAuditData,
    architectureConfig,
  ] = await Promise.all([
    getExecutiveLeverageDiagnosticData(participantSessionId),
    getZoneOfInvestmentData(sessionId, participantSessionId),
    getDelegationCandidates(participantSessionId),
    getArchitectureData(sessionId, participantSessionId),
    getDelegationBeliefsData(participantSessionId),
    getExecutiveSupportAuditData(participantSessionId),
    getExecutiveSupportArchitectureConfig(),
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
    blueprintDescription: s.blueprintDescription,
    selectionOrder: s.selectionOrder,
    leverageLevel: session.priority_leverage_reveal_unlocked ? s.leverageLevelSnapshot : null,
  }));

  const priorityLeverageCounts = new Map<LeverageLevel, number>();
  for (const o of priorityOpportunities) {
    if (!o.leverageLevel) continue;
    priorityLeverageCounts.set(o.leverageLevel, (priorityLeverageCounts.get(o.leverageLevel) ?? 0) + 1);
  }
  const priorityLeveragePattern = (["execution", "orchestration", "strategic", "systems"] as LeverageLevel[])
    .filter((level) => priorityLeverageCounts.has(level))
    .map((level) => ({ level, count: priorityLeverageCounts.get(level)! }));

  const selfIdentification = (participantSession?.self_identification as SelfIdentification | null) ?? null;
  const leadershipWiring = selfIdentification
    ? { wiring: selfIdentification, ...LEADERSHIP_WIRING_COPY[selfIdentification] }
    : null;

  const zonePcts = normalizeZonePercentages(zone.macroZoneDistribution);
  const capacityMap = zonePcts
    ? {
        investmentPct: zonePcts.investmentPct,
        ambiguityPct: zonePcts.ambiguityPct,
        vulnerabilityPct: zonePcts.vulnerabilityPct,
        patternInsight: classifyCapacityMapPattern(zonePcts).insight,
      }
    : null;

  let delegationBeliefs: BlueprintData["delegationBeliefs"] = null;
  if (delegationBeliefsData?.result) {
    const avgs: Record<DelegationDomain, number> = {
      trust_control: delegationBeliefsData.result.trustControlAvg,
      team_outcomes: delegationBeliefsData.result.teamOutcomesAvg,
      workload_resources: delegationBeliefsData.result.workloadResourcesAvg,
    };
    const biggestImpediment = classifyBiggestImpediment(delegationBeliefsData.result.strongestBarrierDomains);
    const statuses = rankDelegationBeliefStatuses(avgs, biggestImpediment);
    delegationBeliefs = {
      dimensions: (["trust_control", "team_outcomes", "workload_resources"] as DelegationDomain[]).map((domain) => ({
        domain,
        avg: avgs[domain],
        statusLabel: statuses[domain],
      })),
      biggestImpediment: {
        kind: biggestImpediment.kind,
        headline: biggestImpediment.headline,
        interpretation: biggestImpediment.interpretation,
      },
    };
  }

  const highestValueFocus = {
    investmentPct: capacityMap?.investmentPct ?? 0,
    items: selectHighestValueFocus(zone.personalizedPlacements).map((p) => ({
      responsibilityId: p.responsibilityId,
      label: p.label,
      blueprintDescription: p.blueprintDescription,
    })),
  };

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
        currentSupportAiAutomation: participantRow?.current_support_ai_automation ?? false,
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
    selfIdentification,
    leadershipWiring,
    zone,
    capacityMap,
    delegation: {
      priorityOwnershipTransferOpportunity: priorityOwnershipTransferOpportunity
        ? { label: priorityOwnershipTransferOpportunity.label, interpretation: priorityOwnershipTransferOpportunity.interpretation }
        : null,
      priorityOpportunities,
    },
    delegationBeliefs,
    priorityLeverage: {
      revealed: session.priority_leverage_reveal_unlocked,
      pattern: priorityLeveragePattern,
    },
    executiveSupportAudit,
    architecture,
    architectureConfig,
    highestValueFocus,
    followUpRequested: !!followUp,
    reflections: {
      whiteWhale: reflectionRow?.white_whale ?? null,
      successVision: reflectionRow?.success_vision ?? null,
      successVisionFollowup: reflectionRow?.success_vision_white_whale_followup ?? null,
    },
    characterFitStatus: "PREVIEW",
  };
}
