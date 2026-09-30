"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markModuleComplete } from "@/lib/actions/participant";
import { missingRequiredQuestions, type StructuredAssessmentConfig } from "@/lib/structuredAssessmentSchema";
import { scoreThinkingTraps, type ThinkingTrapsConfig } from "@/lib/thinkingTrapsSchema";
import type { Json } from "@/types/database";

/** Same shape as submitStructuredAssessment (so StructuredAssessmentFlow
 * can take either as its submitAction prop), but scores the submission
 * before saving it -- the one thing the generic engine doesn't know how to
 * do, since scoring is different per assessment_key. */
export async function submitThinkingTraps(params: {
  participantSessionId: string;
  assessmentId: string;
  versionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
  answers: Record<string, Json>;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: version } = await supabase
    .from("structured_assessment_versions")
    .select("config")
    .eq("id", params.versionId)
    .maybeSingle();
  if (!version) return { ok: false as const, message: "Assessment version not found." };
  const config = version.config as unknown as StructuredAssessmentConfig & ThinkingTrapsConfig;

  const { data: existing } = await supabase
    .from("structured_assessment_submissions")
    .select("answers")
    .eq("participant_session_id", params.participantSessionId)
    .eq("assessment_id", params.assessmentId)
    .maybeSingle();
  const mergedAnswers = { ...((existing?.answers as Record<string, Json>) ?? {}), ...params.answers };

  const missing = missingRequiredQuestions(config, mergedAnswers);
  if (missing.length > 0) {
    return { ok: false as const, message: "All 40 items need a response before this can be submitted." };
  }

  const derived = scoreThinkingTraps(config, mergedAnswers);

  const { error } = await supabase.from("structured_assessment_submissions").upsert(
    {
      participant_session_id: params.participantSessionId,
      assessment_id: params.assessmentId,
      version_id: params.versionId,
      answers: mergedAnswers,
      derived: derived as unknown as Json,
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
