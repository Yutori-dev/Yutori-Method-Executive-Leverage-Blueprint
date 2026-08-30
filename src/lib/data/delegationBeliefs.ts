import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DOMAIN_LABEL, type DelegationDomain } from "@/lib/delegationBeliefsConstants";

export type { DelegationDomain };

export interface DelegationBeliefsQuestion {
  id: string;
  sortOrder: number;
  section: "belief" | "ownership_transfer";
  prompt: string;
  domain: DelegationDomain | null;
  opportunityLabel: string | null;
}

export interface DelegationBeliefsConfig {
  introCopy: string;
  ownershipTransferIntro: string;
  domainCopy: Record<DelegationDomain, { low: string; mid: string; high: string }>;
  thresholdLowMax: number;
  thresholdMidMax: number;
}

export interface DelegationBeliefsResult {
  trustControlAvg: number;
  teamOutcomesAvg: number;
  workloadResourcesAvg: number;
  strongestBarrierDomains: DelegationDomain[];
  flaggedOpportunities: { id: string; label: string; interpretation: string }[];
}

export interface DelegationBeliefsData {
  config: DelegationBeliefsConfig;
  questions: DelegationBeliefsQuestion[];
  responses: Record<string, number>;
  result: DelegationBeliefsResult | null;
}

export interface DelegationBarrier {
  domain: DelegationDomain;
  domainLabel: string;
  avg: number;
  interpretation: string;
}

/** Blueprint/admin-view helper: the participant's strongest Delegation
 * Beliefs barrier(s) (ties included), with the interpretation copy that
 * matches their domain average against the config's thresholds -- same
 * range logic the participant results screen uses, kept here as the one
 * place the other 3 call sites (Blueprint web, Blueprint PDF, admin
 * coaching view) can share instead of re-deriving it. */
export function getPrimaryDelegationBarriers(data: DelegationBeliefsData): DelegationBarrier[] {
  if (!data.result) return [];
  const avgByDomain: Record<DelegationDomain, number> = {
    trust_control: data.result.trustControlAvg,
    team_outcomes: data.result.teamOutcomesAvg,
    workload_resources: data.result.workloadResourcesAvg,
  };
  return data.result.strongestBarrierDomains.map((domain) => {
    const avg = avgByDomain[domain];
    const copy = data.config.domainCopy[domain];
    const interpretation = avg <= data.config.thresholdLowMax ? copy.low : avg <= data.config.thresholdMidMax ? copy.mid : copy.high;
    return { domain, domainLabel: DOMAIN_LABEL[domain], avg, interpretation };
  });
}

/** The single lowest-scoring flagged Ownership Transfer Indicator (already
 * ordered ascending by score then question order by the calculating RPC),
 * for the Blueprint's "Priority Ownership Transfer Opportunity." */
export function getPriorityOwnershipTransferOpportunity(data: DelegationBeliefsData) {
  if (!data.result || data.result.flaggedOpportunities.length === 0) return null;
  return data.result.flaggedOpportunities[0];
}

export { DOMAIN_LABEL };

export async function getDelegationBeliefsData(participantSessionId: string): Promise<DelegationBeliefsData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: config } = await supabase
    .from("delegation_beliefs_config")
    .select(
      "id, intro_copy, ownership_transfer_intro, trust_control_low_copy, trust_control_mid_copy, trust_control_high_copy, team_outcomes_low_copy, team_outcomes_mid_copy, team_outcomes_high_copy, workload_resources_low_copy, workload_resources_mid_copy, workload_resources_high_copy, threshold_low_max, threshold_mid_max",
    )
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!config) return null;

  const [{ data: questions }, { data: responseRows }, { data: resultRow }] = await Promise.all([
    supabase
      .from("delegation_beliefs_questions")
      .select("id, sort_order, section, prompt, domain, opportunity_label, rarely_interpretation, sometimes_interpretation")
      .eq("config_id", config.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("delegation_beliefs_responses")
      .select("question_id, score")
      .eq("participant_session_id", participantSessionId),
    supabase
      .from("delegation_beliefs_results")
      .select("trust_control_avg, team_outcomes_avg, workload_resources_avg, strongest_barrier_domains, flagged_opportunity_question_ids")
      .eq("participant_session_id", participantSessionId)
      .maybeSingle(),
  ]);

  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));
  const scoreByQuestionId = new Map((responseRows ?? []).map((r) => [r.question_id, r.score]));

  let result: DelegationBeliefsResult | null = null;
  if (resultRow) {
    const flaggedOpportunities = (resultRow.flagged_opportunity_question_ids ?? [])
      .map((id: string) => questionById.get(id))
      .filter((q): q is NonNullable<typeof q> => !!q)
      .map((q) => ({
        id: q.id,
        label: q.opportunity_label ?? "",
        interpretation: scoreByQuestionId.get(q.id) === 1 ? q.rarely_interpretation ?? "" : q.sometimes_interpretation ?? "",
      }));

    result = {
      trustControlAvg: resultRow.trust_control_avg,
      teamOutcomesAvg: resultRow.team_outcomes_avg,
      workloadResourcesAvg: resultRow.workload_resources_avg,
      strongestBarrierDomains: (resultRow.strongest_barrier_domains ?? []) as DelegationDomain[],
      flaggedOpportunities,
    };
  }

  return {
    config: {
      introCopy: config.intro_copy,
      ownershipTransferIntro: config.ownership_transfer_intro,
      domainCopy: {
        trust_control: { low: config.trust_control_low_copy, mid: config.trust_control_mid_copy, high: config.trust_control_high_copy },
        team_outcomes: { low: config.team_outcomes_low_copy, mid: config.team_outcomes_mid_copy, high: config.team_outcomes_high_copy },
        workload_resources: { low: config.workload_resources_low_copy, mid: config.workload_resources_mid_copy, high: config.workload_resources_high_copy },
      },
      thresholdLowMax: config.threshold_low_max,
      thresholdMidMax: config.threshold_mid_max,
    },
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      sortOrder: q.sort_order,
      section: q.section as "belief" | "ownership_transfer",
      prompt: q.prompt,
      domain: q.domain as DelegationDomain | null,
      opportunityLabel: q.opportunity_label,
    })),
    responses: Object.fromEntries((responseRows ?? []).map((r) => [r.question_id, r.score])),
    result,
  };
}
