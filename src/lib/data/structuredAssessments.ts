import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { StructuredAssessmentConfig } from "@/lib/structuredAssessmentSchema";

export interface StructuredAssessmentState {
  assessmentId: string;
  versionId: string;
  config: StructuredAssessmentConfig;
  status: "not_started" | "in_progress" | "complete";
  answers: Record<string, Json>;
}

export async function getStructuredAssessment(
  assessmentKey: string,
  participantSessionId: string,
): Promise<StructuredAssessmentState | null> {
  const supabase = await createServerSupabaseClient();

  const { data: assessment } = await supabase
    .from("structured_assessments")
    .select("id")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();
  if (!assessment) return null;

  // "Current" lives inside config (see the foundation migration's comment
  // on the partial unique index), so the current version is read as
  // "the one row where config.is_current is true", not via a column.
  const { data: versions } = await supabase
    .from("structured_assessment_versions")
    .select("id, config")
    .eq("assessment_id", assessment.id);
  const current = (versions ?? []).find((v) => (v.config as { is_current?: boolean })?.is_current === true);
  if (!current) return null;

  const { data: submission } = await supabase
    .from("structured_assessment_submissions")
    .select("status, answers")
    .eq("participant_session_id", participantSessionId)
    .eq("assessment_id", assessment.id)
    .maybeSingle();

  return {
    assessmentId: assessment.id,
    versionId: current.id,
    config: current.config as unknown as StructuredAssessmentConfig,
    status: (submission?.status as StructuredAssessmentState["status"]) ?? "not_started",
    answers: (submission?.answers as Record<string, Json>) ?? {},
  };
}
