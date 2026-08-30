"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface PriorityLeverageRevealConfigInput {
  revealHeader: string;
  revealIntro: string;
  leveragePatternHeader: string;
  auditContextHeader: string;
  noSecondaryGapLabel: string;
  interpretationHeadline: string;
  interpretationBody: string;
}

/** Saves as a brand-new config version, same convention as every other
 * activity's config (e.g. saveExecutiveSupportAuditConfigVersion). */
export async function savePriorityLeverageRevealConfigVersion(input: PriorityLeverageRevealConfigInput) {
  const supabase = await createServerSupabaseClient();

  const { data: latest, error: latestError } = await supabase
    .from("priority_leverage_reveal_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { ok: false as const, message: latestError.message };

  const nextVersion = (latest?.version ?? 0) + 1;

  const { error } = await supabase.from("priority_leverage_reveal_config").insert({
    version: nextVersion,
    active: true,
    reveal_header: input.revealHeader,
    reveal_intro: input.revealIntro,
    leverage_pattern_header: input.leveragePatternHeader,
    audit_context_header: input.auditContextHeader,
    no_secondary_gap_label: input.noSecondaryGapLabel,
    interpretation_headline: input.interpretationHeadline,
    interpretation_body: input.interpretationBody,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/priority-leverage-reveal-config");
  return { ok: true as const, version: nextVersion };
}
