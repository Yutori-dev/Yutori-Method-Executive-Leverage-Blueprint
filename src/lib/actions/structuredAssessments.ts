"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markModuleComplete } from "@/lib/actions/participant";
import type { Json } from "@/types/database";

/** Autosave: merges the given answers into the submission row, creating it
 * (in_progress, started_at) on first save. Runs as the signed-in
 * participant -- RLS's self-scoped write policy on
 * structured_assessment_submissions is the real check here. */
export async function saveStructuredAssessmentAnswers(params: {
  participantSessionId: string;
  assessmentId: string;
  versionId: string;
  answers: Record<string, Json>;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("structured_assessment_submissions")
    .select("answers, status")
    .eq("participant_session_id", params.participantSessionId)
    .eq("assessment_id", params.assessmentId)
    .maybeSingle();

  const mergedAnswers = { ...((existing?.answers as Record<string, Json>) ?? {}), ...params.answers };

  const { error } = await supabase.from("structured_assessment_submissions").upsert(
    {
      participant_session_id: params.participantSessionId,
      assessment_id: params.assessmentId,
      version_id: params.versionId,
      answers: mergedAnswers,
      status: existing?.status === "complete" ? "complete" : "in_progress",
      started_at: existing ? undefined : new Date().toISOString(),
    },
    { onConflict: "participant_session_id,assessment_id" },
  );

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

/** Submit: same merge as above, then status -> complete and the module
 * marked complete through the existing dashboard-wide progress tracker
 * (participant.ts's markModuleComplete) so the guided-progression model
 * advances the same way it does for every other module. */
export async function submitStructuredAssessment(params: {
  participantSessionId: string;
  assessmentId: string;
  versionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
  answers: Record<string, Json>;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("structured_assessment_submissions")
    .select("answers")
    .eq("participant_session_id", params.participantSessionId)
    .eq("assessment_id", params.assessmentId)
    .maybeSingle();
  const mergedAnswers = { ...((existing?.answers as Record<string, Json>) ?? {}), ...params.answers };

  const { error } = await supabase.from("structured_assessment_submissions").upsert(
    {
      participant_session_id: params.participantSessionId,
      assessment_id: params.assessmentId,
      version_id: params.versionId,
      answers: mergedAnswers,
      status: "complete",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "participant_session_id,assessment_id" },
  );
  if (error) return { ok: false as const, message: error.message };

  await markModuleComplete({
    participantSessionId: params.participantSessionId,
    moduleId: params.moduleId,
    moduleKey: params.moduleKey,
    sessionPath: params.sessionPath,
  });

  revalidatePath(params.sessionPath);
  return { ok: true as const };
}
