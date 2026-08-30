import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Whether the participant has completed Participant Registration / Intake
 * (client spec round 4) -- the real gate before Section 1, replacing what
 * used to be a dev-only placeholder "Module 0 context" step that was
 * always skipped in production. Intake isn't one of the seven dashboard
 * modules and has no progress row of its own; completion is simply
 * `participants.intake_completed_at is not null`. */
export async function hasCompletedIntake(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("participants")
    .select("intake_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  return data?.intake_completed_at != null;
}
