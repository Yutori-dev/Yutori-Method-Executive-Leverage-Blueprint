import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface WorkshopFeedbackPageData {
  alreadySubmitted: boolean;
  diagnosticFollowUpUrl: string | null;
}

export async function getWorkshopFeedbackPageData(participantSessionId: string): Promise<WorkshopFeedbackPageData> {
  const supabase = await createServerSupabaseClient();

  const [{ data: feedback }, { data: settings }] = await Promise.all([
    supabase.from("workshop_feedback").select("id").eq("participant_session_id", participantSessionId).maybeSingle(),
    supabase.from("workshop_feedback_settings").select("diagnostic_follow_up_url").eq("id", true).maybeSingle(),
  ]);

  return {
    alreadySubmitted: !!feedback,
    diagnosticFollowUpUrl: settings?.diagnostic_follow_up_url ?? null,
  };
}
