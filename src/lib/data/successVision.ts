import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SuccessVisionData {
  successVision: string;
  whiteWhaleFollowup: string;
  whiteWhale: string | null;
}

export async function getSuccessVisionData(participantSessionId: string): Promise<SuccessVisionData> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("participant_reflections")
    .select("success_vision, success_vision_white_whale_followup, white_whale")
    .eq("participant_session_id", participantSessionId)
    .maybeSingle();

  return {
    successVision: data?.success_vision ?? "",
    whiteWhaleFollowup: data?.success_vision_white_whale_followup ?? "",
    whiteWhale: data?.white_whale ?? null,
  };
}
