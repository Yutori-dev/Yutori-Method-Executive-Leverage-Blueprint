"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PriorityDelegationConfig } from "@/lib/data/delegation";

/** Saves as a new version -- never mutates live rows, matching the
 * versioning convention used everywhere else in this schema. */
export async function savePriorityDelegationConfig(input: PriorityDelegationConfig) {
  const supabase = await createServerSupabaseClient();

  const { data: latest } = await supabase
    .from("priority_delegation_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("priority_delegation_config").insert({
    version: (latest?.version ?? 0) + 1,
    active: true,
    intro_copy: input.introCopy,
    fewer_than_three_copy: input.fewerThanThreeCopy,
    zero_eligible_copy: input.zeroEligibleCopy,
    zone_ambiguity_description: input.zoneAmbiguityDescription,
    zone_vulnerability_description: input.zoneVulnerabilityDescription,
    pressure_test_question: input.pressureTestQuestion,
    somewhat_no_followup_copy: input.somewhatNoFollowupCopy,
    confirmation_copy: input.confirmationCopy,
  });
  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/priority-delegation-config");
  return { ok: true as const };
}
