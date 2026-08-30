import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PriorityLeverageRevealConfigInput } from "@/lib/actions/priorityLeverageRevealConfig";

/** Full editable shape for the admin config screen -- participant-scoped
 * consumption goes through src/lib/data/priorityLeverageReveal.ts instead. */
export async function getPriorityLeverageRevealConfigForEditing(): Promise<PriorityLeverageRevealConfigInput> {
  const supabase = await createServerSupabaseClient();

  const { data: config } = await supabase
    .from("priority_leverage_reveal_config")
    .select(
      "reveal_header, reveal_intro, leverage_pattern_header, audit_context_header, no_secondary_gap_label, interpretation_headline, interpretation_body",
    )
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!config) {
    throw new Error("No active Priority Leverage Opportunities Reveal config found.");
  }

  return {
    revealHeader: config.reveal_header,
    revealIntro: config.reveal_intro,
    leveragePatternHeader: config.leverage_pattern_header,
    auditContextHeader: config.audit_context_header,
    noSecondaryGapLabel: config.no_secondary_gap_label,
    interpretationHeadline: config.interpretation_headline,
    interpretationBody: config.interpretation_body,
  };
}
