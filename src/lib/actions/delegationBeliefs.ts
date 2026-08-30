"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveDelegationBeliefResponse(params: {
  participantSessionId: string;
  questionId: string;
  score: number;
}) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("save_delegation_belief_response", {
    p_participant_session_id: params.participantSessionId,
    p_question_id: params.questionId,
    p_score: params.score,
  });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function calculateDelegationBeliefsResults(params: { participantSessionId: string; sessionPath: string }) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("calculate_delegation_beliefs_results", {
    p_participant_session_id: params.participantSessionId,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath(params.sessionPath);
  return { ok: true as const };
}
