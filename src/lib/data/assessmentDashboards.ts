import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { SubmissionRow } from "@/lib/assessmentStats";

export const DASHBOARD_ASSESSMENTS = [
  { key: "ea_experience_assessment", label: "EA Experience Assessment" },
  { key: "thinking_traps", label: "Visionary Thinking Traps" },
  { key: "ea_leverage_audit_visionary", label: "EA Leverage Audit (Visionary)" },
  { key: "ea_leverage_audit_ea", label: "EA Leverage Audit (EA)" },
] as const;

export interface DashboardData {
  assessmentId: string;
  /** Config of the CURRENT version -- copy/labels. Submissions may have
   * been completed under an older version; question ids are stable. */
  config: Record<string, unknown>;
  rows: SubmissionRow[];
}

/** Every submission for one assessment within one session, with the
 * participant's name. Runs as the signed-in admin (RLS: admins read all). */
export async function getDashboardData(sessionId: string, assessmentKey: string): Promise<DashboardData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: assessment } = await supabase
    .from("structured_assessments")
    .select("id")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();
  if (!assessment) return null;

  const { data: versions } = await supabase
    .from("structured_assessment_versions")
    .select("config")
    .eq("assessment_id", assessment.id);
  const current = (versions ?? []).find((v) => (v.config as { is_current?: boolean })?.is_current === true);
  if (!current) return null;

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id, participants(first_name, last_name)")
    .eq("session_id", sessionId);
  const nameByPs = new Map(
    (enrollments ?? []).map((e) => {
      const p = e.participants as unknown as { first_name: string; last_name: string } | null;
      return [e.id, p ? `${p.first_name} ${p.last_name}` : "Unknown"] as const;
    }),
  );

  const psIds = [...nameByPs.keys()];
  const rows: SubmissionRow[] = [];
  for (let i = 0; i < psIds.length; i += 50) {
    const { data } = await supabase
      .from("structured_assessment_submissions")
      .select("participant_session_id, status, answers, dyad_id, completed_at")
      .eq("assessment_id", assessment.id)
      .in("participant_session_id", psIds.slice(i, i + 50));
    for (const s of data ?? []) {
      rows.push({
        psId: s.participant_session_id,
        name: nameByPs.get(s.participant_session_id) ?? "Unknown",
        status: s.status as SubmissionRow["status"],
        answers: (s.answers as Record<string, Json>) ?? {},
        dyadId: s.dyad_id,
        completedAt: s.completed_at,
      });
    }
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));

  return { assessmentId: assessment.id, config: current.config as Record<string, unknown>, rows };
}

export async function getSessionName(sessionId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  return data?.name ?? null;
}
