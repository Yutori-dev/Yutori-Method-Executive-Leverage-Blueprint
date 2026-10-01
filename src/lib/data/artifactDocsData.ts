import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ARTIFACT_ASSESSMENT_KEYS, buildArtifactDoc, type ArtifactDoc } from "@/lib/artifactDocs";

const ORDER = new Map<string, number>(ARTIFACT_ASSESSMENT_KEYS.map((k, i) => [k, i]));

/** Completed artifacts of the new modules for one enrollment, built from the
 * version each was completed under. Runs as the caller: a participant (or a
 * merged sibling registration) or an admin -- RLS decides. */
export async function getArtifactDocs(participantSessionId: string): Promise<ArtifactDoc[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("structured_assessment_submissions")
    .select("answers, derived, status, structured_assessments(assessment_key), structured_assessment_versions(config)")
    .eq("participant_session_id", participantSessionId)
    .eq("status", "complete");

  const docs: ArtifactDoc[] = [];
  for (const row of data ?? []) {
    const asm = row.structured_assessments as unknown as { assessment_key: string } | null;
    const ver = row.structured_assessment_versions as unknown as { config: Record<string, unknown> } | null;
    if (!asm || !ver || !ORDER.has(asm.assessment_key)) continue;
    const doc = buildArtifactDoc({
      assessmentKey: asm.assessment_key,
      config: ver.config,
      answers: (row.answers as Record<string, unknown>) ?? {},
      derived: (row.derived as Record<string, unknown> | null) ?? null,
    });
    if (doc) docs.push(doc);
  }
  return docs.sort((x, y) => (ORDER.get(x.key) ?? 99) - (ORDER.get(y.key) ?? 99));
}

/** Which of the caller's enrollments have at least one finished artifact --
 * for the portal home's "past sessions" list. */
export async function enrollmentsWithArtifacts(participantSessionIds: string[]): Promise<Set<string>> {
  if (participantSessionIds.length === 0) return new Set();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("structured_assessment_submissions")
    .select("participant_session_id, structured_assessments(assessment_key)")
    .in("participant_session_id", participantSessionIds)
    .eq("status", "complete");
  const out = new Set<string>();
  for (const row of data ?? []) {
    const asm = row.structured_assessments as unknown as { assessment_key: string } | null;
    if (asm && ORDER.has(asm.assessment_key)) out.add(row.participant_session_id);
  }
  return out;
}
