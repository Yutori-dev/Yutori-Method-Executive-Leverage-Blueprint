import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DelegationDomain } from "@/lib/delegationBeliefsConstants";
import type { DelegationBeliefsConfigInput, DelegationBeliefsQuestionInput } from "@/lib/actions/delegationBeliefsConfig";

/** Full editable shape for the admin config screen -- distinct from
 * src/lib/data/delegationBeliefs.ts's getDelegationBeliefsData, which is
 * participant-scoped (includes that participant's responses/result). This
 * loader has no participant context, just the latest active content. */
export async function getDelegationBeliefsConfigForEditing(): Promise<DelegationBeliefsConfigInput> {
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

  if (!config) {
    throw new Error("No active Delegation Beliefs config found.");
  }

  const { data: questions } = await supabase
    .from("delegation_beliefs_questions")
    .select("sort_order, section, prompt, domain, opportunity_label, rarely_interpretation, sometimes_interpretation")
    .eq("config_id", config.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const domainCopy: Record<DelegationDomain, { low: string; mid: string; high: string }> = {
    trust_control: { low: config.trust_control_low_copy, mid: config.trust_control_mid_copy, high: config.trust_control_high_copy },
    team_outcomes: { low: config.team_outcomes_low_copy, mid: config.team_outcomes_mid_copy, high: config.team_outcomes_high_copy },
    workload_resources: {
      low: config.workload_resources_low_copy,
      mid: config.workload_resources_mid_copy,
      high: config.workload_resources_high_copy,
    },
  };

  const questionInputs: DelegationBeliefsQuestionInput[] = (questions ?? []).map((q) => ({
    sortOrder: q.sort_order,
    section: q.section as "belief" | "ownership_transfer",
    prompt: q.prompt,
    domain: q.domain as DelegationDomain | null,
    opportunityLabel: q.opportunity_label,
    rarelyInterpretation: q.rarely_interpretation,
    sometimesInterpretation: q.sometimes_interpretation,
  }));

  return {
    introCopy: config.intro_copy,
    ownershipTransferIntro: config.ownership_transfer_intro,
    domainCopy,
    thresholdLowMax: config.threshold_low_max,
    thresholdMidMax: config.threshold_mid_max,
    questions: questionInputs,
  };
}
