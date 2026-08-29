"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { WhiteWhaleConfigData, LeadershipWiringConfigData } from "@/lib/data/operatingAltitudeConfig";

/** Saves each as a new version -- never mutates live rows, matching the
 * versioning convention used everywhere else in this schema. */
export async function saveWhiteWhaleConfig(input: WhiteWhaleConfigData) {
  const supabase = await createServerSupabaseClient();

  const { data: latest } = await supabase
    .from("white_whale_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("white_whale_config").insert({
    version: (latest?.version ?? 0) + 1,
    header: input.header,
    setup_copy: input.setupCopy,
    prompt: input.prompt,
    placeholder_text: input.placeholderText,
    privacy_note: input.privacyNote,
    active: true,
  });
  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/operating-altitude-config");
  return { ok: true as const };
}

export async function saveLeadershipWiringConfig(input: LeadershipWiringConfigData) {
  const supabase = await createServerSupabaseClient();

  const { data: latest } = await supabase
    .from("leadership_wiring_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("leadership_wiring_config").insert({
    version: (latest?.version ?? 0) + 1,
    header: input.header,
    prompt: input.prompt,
    visionary_description: input.visionaryDescription,
    integrator_description: input.integratorDescription,
    hybrid_description: input.hybridDescription,
    dashboard_note: input.dashboardNote,
    active: true,
  });
  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/operating-altitude-config");
  return { ok: true as const };
}
