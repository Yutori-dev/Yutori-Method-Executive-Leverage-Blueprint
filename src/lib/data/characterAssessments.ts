import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CharacterAssessmentRow {
  id: string;
  masterProfileId: string | null;
  participantName: string | null;
  sourceEmail: string | null;
  sourceCompletedAt: string | null;
  importedAt: string;
  hasScores: boolean;
  reportFileName: string | null;
  released: boolean;
}

export async function listCharacterAssessments(filter?: { masterProfileId?: string }): Promise<CharacterAssessmentRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("character_assessments")
    .select("id, master_profile_id, source_email, source_completed_at, imported_at, scores, report_file_name, released_to_participant")
    .order("imported_at", { ascending: false })
    .limit(1000);
  if (filter?.masterProfileId) query = query.eq("master_profile_id", filter.masterProfileId);
  const { data } = await query;
  const rows = data ?? [];

  const profileIds = [...new Set(rows.map((r) => r.master_profile_id).filter((id): id is string => !!id))];
  const nameByProfile = new Map<string, string>();
  for (let i = 0; i < profileIds.length; i += 50) {
    const { data: people } = await supabase
      .from("participants")
      .select("master_profile_id, first_name, last_name, created_at")
      .in("master_profile_id", profileIds.slice(i, i + 50))
      .order("created_at", { ascending: true });
    for (const p of people ?? []) {
      if (!nameByProfile.has(p.master_profile_id)) nameByProfile.set(p.master_profile_id, `${p.first_name} ${p.last_name}`);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    masterProfileId: r.master_profile_id,
    participantName: r.master_profile_id ? (nameByProfile.get(r.master_profile_id) ?? null) : null,
    sourceEmail: r.source_email,
    sourceCompletedAt: r.source_completed_at,
    importedAt: r.imported_at,
    hasScores: r.scores !== null,
    reportFileName: r.report_file_name,
    released: r.released_to_participant,
  }));
}

export interface CharacterAssessmentDetail extends CharacterAssessmentRow {
  rawResponses: Record<string, string>;
  reportFilePath: string | null;
}

export async function getCharacterAssessment(id: string): Promise<CharacterAssessmentDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data: r } = await supabase
    .from("character_assessments")
    .select("id, master_profile_id, source_email, source_completed_at, imported_at, scores, report_file_name, report_file_path, released_to_participant, raw_responses")
    .eq("id", id)
    .maybeSingle();
  if (!r) return null;

  let participantName: string | null = null;
  if (r.master_profile_id) {
    const { data: p } = await supabase
      .from("participants")
      .select("first_name, last_name")
      .eq("master_profile_id", r.master_profile_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (p) participantName = `${p.first_name} ${p.last_name}`;
  }

  return {
    id: r.id,
    masterProfileId: r.master_profile_id,
    participantName,
    sourceEmail: r.source_email,
    sourceCompletedAt: r.source_completed_at,
    importedAt: r.imported_at,
    hasScores: r.scores !== null,
    reportFileName: r.report_file_name,
    reportFilePath: r.report_file_path,
    released: r.released_to_participant,
    rawResponses: (r.raw_responses ?? {}) as Record<string, string>,
  };
}

export interface MyCharacterReport {
  id: string;
  fileName: string;
  filePath: string;
  completedAt: string | null;
}

/** Participant portal: reports an admin has released, across every
 * registration merged into the caller's profile. RLS already limits this to
 * released rows on the caller's profile; the filters just keep the query
 * explicit. */
export async function getMyCharacterReports(): Promise<MyCharacterReport[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: me } = await supabase.from("participants").select("master_profile_id").eq("id", user.id).maybeSingle();
  if (!me) return [];

  const { data } = await supabase
    .from("character_assessments")
    .select("id, report_file_name, report_file_path, source_completed_at, imported_at")
    .eq("master_profile_id", me.master_profile_id)
    .eq("released_to_participant", true)
    .not("report_file_path", "is", null)
    .order("imported_at", { ascending: false });

  return (data ?? []).flatMap((r) =>
    r.report_file_path
      ? [{ id: r.id, fileName: r.report_file_name ?? "Character Assessment report", filePath: r.report_file_path, completedAt: r.source_completed_at }]
      : [],
  );
}
