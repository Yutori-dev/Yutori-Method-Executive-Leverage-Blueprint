"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { orderModulesForSession } from "@/lib/moduleOrder";
import type { SelfIdentification } from "@/types/database";

/**
 * self_identification and the participant_reflections fields are raw
 * self-reported input, not derived/computed values, so -- consistent with
 * how `responses` already works -- these are plain RLS-scoped writes, not
 * routed through a SECURITY DEFINER RPC (see the migration comment in
 * 20260901000001_gap_fill_schema.sql).
 *
 * White Whale and Leadership Wiring are standalone modules, opened by the
 * facilitator like any other module. Since these are plain RLS writes rather
 * than RPCs, the unlock check has to live here explicitly -- server-side
 * enforcement, not just the UI declining to render the step, mirroring how
 * every other RPC in this app re-checks module-unlock state itself rather
 * than trusting the caller. (The older per-activity unlock flags are still
 * honoured for sessions that were already using them.)
 */

async function isModuleUnlockedFor(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  participantSessionId: string,
  moduleKey: "white_whale" | "leadership_wiring",
): Promise<boolean> {
  const { data: ps } = await supabase
    .from("participant_sessions")
    .select("session_id")
    .eq("id", participantSessionId)
    .maybeSingle();
  if (!ps) return false;

  const [{ data: session }, { data: modules }] = await Promise.all([
    supabase
      .from("sessions")
      .select("active_module_id, module_order, disabled_module_keys, white_whale_unlocked, leadership_wiring_unlocked")
      .eq("id", ps.session_id)
      .maybeSingle(),
    supabase.from("modules").select("id, key, sort_order").eq("active", true),
  ]);
  if (!session || !modules) return false;

  const legacyFlag = moduleKey === "white_whale" ? session.white_whale_unlocked : session.leadership_wiring_unlocked;
  if (legacyFlag) return true;
  if ((session.disabled_module_keys ?? []).includes(moduleKey)) return false;

  // Unlocked = at or before the cohort's active module in THIS session's order.
  const ordered = orderModulesForSession(modules, session.module_order);
  const active = ordered.find((m) => m.id === session.active_module_id);
  const target = ordered.find((m) => m.key === moduleKey);
  return Boolean(active && target && target.sort_order <= active.sort_order);
}

export async function setSelfIdentification(params: {
  participantSessionId: string;
  value: SelfIdentification;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();

  const unlocked = await isModuleUnlockedFor(supabase, params.participantSessionId, "leadership_wiring");
  if (!unlocked) return { ok: false as const, message: "Leadership Wiring is not yet unlocked." };

  const { error } = await supabase
    .from("participant_sessions")
    .update({ self_identification: params.value })
    .eq("id", params.participantSessionId);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
  return { ok: true as const };
}

export async function saveReflection(params: {
  participantSessionId: string;
  field: "white_whale" | "success_vision" | "success_vision_white_whale_followup";
  value: string;
}) {
  const supabase = await createServerSupabaseClient();

  if (params.field === "white_whale") {
    const unlocked = await isModuleUnlockedFor(supabase, params.participantSessionId, "white_whale");
    if (!unlocked) return { ok: false as const, message: "White Whale is not yet unlocked." };
  }

  const payload: {
    participant_session_id: string;
    white_whale?: string;
    success_vision?: string;
    success_vision_white_whale_followup?: string;
  } = { participant_session_id: params.participantSessionId };
  payload[params.field] = params.value;

  const { error } = await supabase
    .from("participant_reflections")
    .upsert(payload, { onConflict: "participant_session_id" });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}
