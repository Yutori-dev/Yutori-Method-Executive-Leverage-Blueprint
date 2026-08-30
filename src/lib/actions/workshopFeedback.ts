"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface WorkshopFeedbackInput {
  participantSessionId: string;
  rating: number;
  writtenFeedback: string;
  permission: "named" | "anonymous";
}

export async function submitWorkshopFeedback(input: WorkshopFeedbackInput) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("submit_workshop_feedback", {
    p_participant_session_id: input.participantSessionId,
    p_rating: input.rating,
    p_written_feedback: input.writtenFeedback,
    p_permission: input.permission,
  });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}
