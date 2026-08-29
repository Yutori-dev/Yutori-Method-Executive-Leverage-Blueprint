"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * All of these run as the signed-in participant (server client uses their
 * session cookie, not the service role), so RLS is still the real
 * authorization boundary -- these actions are a convenience wrapper, not a
 * trust boundary of their own.
 */

const SUCCESS_MODULE_KEY = "success";

export async function markModuleStarted(params: {
  participantSessionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("participant_module_progress")
    .select("id, status")
    .eq("participant_session_id", params.participantSessionId)
    .eq("module_id", params.moduleId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("participant_module_progress").insert({
      participant_session_id: params.participantSessionId,
      module_id: params.moduleId,
      status: "in_progress",
      started_at: new Date().toISOString(),
    });
  } else if (existing.status === "not_started") {
    await supabase
      .from("participant_module_progress")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  await supabase
    .from("participant_sessions")
    .update({
      current_module_id: params.moduleId,
      completion_state: "in_progress",
      last_active_at: new Date().toISOString(),
    })
    .eq("id", params.participantSessionId);

  revalidatePath(params.sessionPath);
}

export async function markModuleComplete(params: {
  participantSessionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("participant_module_progress")
    .upsert(
      {
        participant_session_id: params.participantSessionId,
        module_id: params.moduleId,
        status: "complete",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "participant_session_id,module_id" },
    );

  const sessionUpdate: { last_active_at: string; completion_state?: "complete" } = {
    last_active_at: new Date().toISOString(),
  };
  if (params.moduleKey === SUCCESS_MODULE_KEY) {
    sessionUpdate.completion_state = "complete";
  }

  await supabase
    .from("participant_sessions")
    .update(sessionUpdate)
    .eq("id", params.participantSessionId);

  revalidatePath(params.sessionPath);
}

export async function saveResponse(params: {
  participantSessionId: string;
  questionId: string;
  answer: unknown;
}) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("responses").upsert(
    {
      participant_session_id: params.participantSessionId,
      question_id: params.questionId,
      answer: params.answer,
    },
    { onConflict: "participant_session_id,question_id" },
  );

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}
