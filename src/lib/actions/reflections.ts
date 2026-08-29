"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SelfIdentification } from "@/types/database";

/**
 * self_identification and the participant_reflections fields are raw
 * self-reported input, not derived/computed values, so -- consistent with
 * how `responses` already works -- these are plain RLS-scoped writes, not
 * routed through a SECURITY DEFINER RPC (see the migration comment in
 * 20260901000001_gap_fill_schema.sql).
 */

export async function setSelfIdentification(params: {
  participantSessionId: string;
  value: SelfIdentification;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
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
