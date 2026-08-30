"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DelegationDomain } from "@/lib/delegationBeliefsConstants";

export interface DelegationBeliefsQuestionInput {
  sortOrder: number;
  section: "belief" | "ownership_transfer";
  prompt: string;
  domain: DelegationDomain | null;
  opportunityLabel: string | null;
  rarelyInterpretation: string | null;
  sometimesInterpretation: string | null;
}

export interface DelegationBeliefsConfigInput {
  introCopy: string;
  ownershipTransferIntro: string;
  domainCopy: Record<DelegationDomain, { low: string; mid: string; high: string }>;
  thresholdLowMax: number;
  thresholdMidMax: number;
  questions: DelegationBeliefsQuestionInput[];
}

/** Saves as a brand-new config version -- never mutates rows a participant
 * may have already answered against, matching the versioning convention
 * used everywhere else in this schema. Requires the "admins write
 * delegation beliefs config/questions" RLS policies (plain admin-authenticated
 * table writes, no RPC needed -- same shape as saveExecutiveLeverageDiagnosticVersion). */
export async function saveDelegationBeliefsConfigVersion(input: DelegationBeliefsConfigInput) {
  const supabase = await createServerSupabaseClient();

  const { data: latest, error: latestError } = await supabase
    .from("delegation_beliefs_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { ok: false as const, message: latestError.message };

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: config, error: configError } = await supabase
    .from("delegation_beliefs_config")
    .insert({
      version: nextVersion,
      active: true,
      intro_copy: input.introCopy,
      ownership_transfer_intro: input.ownershipTransferIntro,
      trust_control_low_copy: input.domainCopy.trust_control.low,
      trust_control_mid_copy: input.domainCopy.trust_control.mid,
      trust_control_high_copy: input.domainCopy.trust_control.high,
      team_outcomes_low_copy: input.domainCopy.team_outcomes.low,
      team_outcomes_mid_copy: input.domainCopy.team_outcomes.mid,
      team_outcomes_high_copy: input.domainCopy.team_outcomes.high,
      workload_resources_low_copy: input.domainCopy.workload_resources.low,
      workload_resources_mid_copy: input.domainCopy.workload_resources.mid,
      workload_resources_high_copy: input.domainCopy.workload_resources.high,
      threshold_low_max: input.thresholdLowMax,
      threshold_mid_max: input.thresholdMidMax,
    })
    .select("id")
    .single();

  if (configError || !config) {
    return { ok: false as const, message: configError?.message ?? "Could not create new version." };
  }

  const { error: questionsError } = await supabase.from("delegation_beliefs_questions").insert(
    input.questions.map((q) => ({
      config_id: config.id,
      sort_order: q.sortOrder,
      section: q.section,
      prompt: q.prompt,
      domain: q.domain,
      opportunity_label: q.opportunityLabel,
      rarely_interpretation: q.rarelyInterpretation,
      sometimes_interpretation: q.sometimesInterpretation,
      active: true,
    })),
  );

  if (questionsError) return { ok: false as const, message: questionsError.message };

  revalidatePath("/admin/delegation-beliefs-config");
  return { ok: true as const, version: nextVersion };
}
