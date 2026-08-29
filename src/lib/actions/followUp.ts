"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * "Discuss My Blueprint" (brief section 15). A participant can only ever
 * create their own row once -- the unique constraint on
 * participant_session_id enforces that at the database level, not just by
 * the button disabling itself after one click.
 */
export async function requestFollowUp(participantSessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("follow_up_interests")
    .insert({ participant_session_id: participantSessionId });

  if (error && !error.message.includes("duplicate")) {
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const };
}
