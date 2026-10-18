"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markModuleComplete } from "@/lib/actions/participant";
import {
  missingEaBufferFields,
  scoreEaBuffer,
  type EaBufferAnswers,
  type EaBufferConfig,
} from "@/lib/eaBufferSchema";
import type { Json } from "@/types/database";

function mergeAnswers(previous: EaBufferAnswers | undefined, next: EaBufferAnswers): EaBufferAnswers {
  return {
    context: { ...(previous?.context ?? {}), ...(next.context ?? {}) },
    ownership: { ...(previous?.ownership ?? {}), ...(next.ownership ?? {}) },
    // Last write wins: changing the tenure answer away from "no EA" clears it.
    noCurrentEa: next.noCurrentEa ?? previous?.noCurrentEa,
  };
}

/** Autosave -- merges in-progress answers without completing or scoring. */
export async function saveEaBufferAnswers(params: {
  participantSessionId: string;
  assessmentId: string;
  versionId: string;
  answers: EaBufferAnswers;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("structured_assessment_submissions")
    .select("answers, status")
    .eq("participant_session_id", params.participantSessionId)
    .eq("assessment_id", params.assessmentId)
    .maybeSingle();
  // A finished submission is not overwritten by stray autosaves.
  if (existing?.status === "complete") return { ok: true as const };

  const merged = mergeAnswers(existing?.answers as unknown as EaBufferAnswers | undefined, params.answers);

  const { error } = await supabase.from("structured_assessment_submissions").upsert(
    {
      participant_session_id: params.participantSessionId,
      assessment_id: params.assessmentId,
      version_id: params.versionId,
      answers: merged as unknown as Json,
      status: "in_progress",
      started_at: existing ? undefined : new Date().toISOString(),
    },
    { onConflict: "participant_session_id,assessment_id" },
  );
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

/** Submit: validates every question, scores the five functions, stores the
 * raw answers and the derived scores/classifications/ranking, and marks the
 * module complete. A participant with no EA completes at once and is simply
 * excluded from every cohort figure. */
export async function submitEaBuffer(params: {
  participantSessionId: string;
  assessmentId: string;
  versionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
  answers: EaBufferAnswers;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: version } = await supabase
    .from("structured_assessment_versions")
    .select("config")
    .eq("id", params.versionId)
    .maybeSingle();
  if (!version) return { ok: false as const, message: "Assessment version not found." };
  const config = version.config as unknown as EaBufferConfig;

  const { data: existing } = await supabase
    .from("structured_assessment_submissions")
    .select("answers")
    .eq("participant_session_id", params.participantSessionId)
    .eq("assessment_id", params.assessmentId)
    .maybeSingle();
  const merged = mergeAnswers(existing?.answers as unknown as EaBufferAnswers | undefined, params.answers);

  if (missingEaBufferFields(config, merged).length > 0) {
    return { ok: false as const, message: "A few required questions are still blank." };
  }

  const derived = scoreEaBuffer(config, merged);

  const { error } = await supabase.from("structured_assessment_submissions").upsert(
    {
      participant_session_id: params.participantSessionId,
      assessment_id: params.assessmentId,
      version_id: params.versionId,
      answers: merged as unknown as Json,
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
