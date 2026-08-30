"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel } from "@/types/database";

export async function saveExecutiveSupportAuditResponse(params: {
  participantSessionId: string;
  questionId: string;
  selectedLayer: LeverageLevel;
}) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("save_executive_support_audit_response", {
    p_participant_session_id: params.participantSessionId,
    p_question_id: params.questionId,
    p_selected_layer: params.selectedLayer,
  });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function calculateExecutiveSupportAuditResults(params: { participantSessionId: string; sessionPath: string }) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("calculate_executive_support_audit_results", {
    p_participant_session_id: params.participantSessionId,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath(params.sessionPath);
  return { ok: true as const };
}
