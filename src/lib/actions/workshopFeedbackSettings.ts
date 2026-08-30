"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveWorkshopFeedbackSettings(diagnosticFollowUpUrl: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("save_workshop_feedback_settings", {
    p_diagnostic_follow_up_url: diagnosticFollowUpUrl,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/workshop-feedback-settings");
  return { ok: true as const };
}
