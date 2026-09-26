import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Master participant profile: the admin-facing, cross-session view of a
 * real person. Same shape convention as adminParticipantProfile.ts (typed
 * interfaces, direct queries, in-memory joins) but keyed by
 * master_profile_id instead of participant_session_id -- deliberately
 * does not recompose the rich per-session detail (assessments, results,
 * architecture) that adminParticipantProfile.ts already owns; this links
 * out to that existing page per enrollment instead of duplicating it.
 */

export interface MasterProfileListRow {
  masterProfileId: string;
  participants: { id: string; firstName: string; lastName: string; email: string }[];
  sessionCount: number;
}

/** Simple keyword heuristic (client brief 2026-09): CEO/founder/owner-type
 * titles read as Visionary, assistant/COO/EA-type titles read as
 * Integrator. Computed on read from whichever linked participant has the
 * most recent title, never stored -- storing it would go stale the
 * moment a title changes or a new registration is merged in. */
const VISIONARY_KEYWORDS = ["ceo", "chief executive", "founder", "owner", "president", "principal"];
const INTEGRATOR_KEYWORDS = [
  "assistant", "coo", "chief operating", "chief of staff", "integrator",
  "operations", "executive assistant", "ea",
];

export function inferRoleFromTitle(title: string | null): "visionary" | "integrator" | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (INTEGRATOR_KEYWORDS.some((k) => t.includes(k))) return "integrator";
  if (VISIONARY_KEYWORDS.some((k) => t.includes(k))) return "visionary";
  return null;
}

export async function searchMasterProfiles(params: {
  query?: string;
  sessionId?: string;
}): Promise<MasterProfileListRow[]> {
  const supabase = await createServerSupabaseClient();
  const { query, sessionId } = params;

  let allowedProfileIds: string[] | null = null;

  if (sessionId) {
    const { data: enrolled } = await supabase
      .from("participant_sessions")
      .select("participant_id")
      .eq("session_id", sessionId);
    const participantIds = (enrolled ?? []).map((e) => e.participant_id);
    if (participantIds.length === 0) return [];
    const { data: profilesForSession } = await supabase
      .from("participants")
      .select("master_profile_id")
      .in("id", participantIds);
    allowedProfileIds = [...new Set((profilesForSession ?? []).map((p) => p.master_profile_id))];
    if (allowedProfileIds.length === 0) return [];
  }

  if (query && query.trim()) {
    const term = query.trim().replace(/[%_]/g, "");
    const { data: matches } = await supabase
      .from("participants")
      .select("master_profile_id")
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(200);
    const matchedIds = [...new Set((matches ?? []).map((m) => m.master_profile_id))];
    allowedProfileIds = allowedProfileIds
      ? allowedProfileIds.filter((id) => matchedIds.includes(id))
      : matchedIds;
    if (allowedProfileIds.length === 0) return [];
  }

  let rowQuery = supabase
    .from("participants")
    .select("id, first_name, last_name, email, master_profile_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (allowedProfileIds) rowQuery = rowQuery.in("master_profile_id", allowedProfileIds);
  const { data: rows } = await rowQuery;
  if (!rows || rows.length === 0) return [];

  const byProfile = new Map<string, MasterProfileListRow>();
  for (const r of rows) {
    const entry = byProfile.get(r.master_profile_id) ?? {
      masterProfileId: r.master_profile_id,
      participants: [],
      sessionCount: 0,
    };
    entry.participants.push({ id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email });
    byProfile.set(r.master_profile_id, entry);
  }

  const { data: sessionCounts } = await supabase
    .from("participant_sessions")
    .select("participant_id")
    .in("participant_id", rows.map((r) => r.id));
  const countByParticipant = new Map<string, number>();
  for (const s of sessionCounts ?? []) {
    countByParticipant.set(s.participant_id, (countByParticipant.get(s.participant_id) ?? 0) + 1);
  }
  for (const entry of byProfile.values()) {
    entry.sessionCount = entry.participants.reduce((sum, p) => sum + (countByParticipant.get(p.id) ?? 0), 0);
  }

  return [...byProfile.values()].sort(
    (a, b) => a.participants[0].lastName.localeCompare(b.participants[0].lastName),
  );
}

export interface MasterProfileDetail {
  masterProfileId: string;
  pairedMasterProfileId: string | null;
  pairedProfileSummary: { firstName: string; lastName: string } | null;
  inferredRoleOverride: "visionary" | "integrator" | null;
  inferredRole: "visionary" | "integrator" | null;
  participants: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName: string | null;
    currentRoleTitle: string | null;
    createdAt: string;
  }[];
  enrollments: {
    participantSessionId: string;
    participantId: string;
    sessionId: string;
    sessionName: string;
    completionState: string;
    lastActiveAt: string;
  }[];
}

export async function getMasterProfileDetail(masterProfileId: string): Promise<MasterProfileDetail | null> {
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("master_profiles")
    .select("id, paired_master_profile_id, inferred_role_override")
    .eq("id", masterProfileId)
    .maybeSingle();
  if (!profile) return null;

  const { data: participants } = await supabase
    .from("participants")
    .select("id, first_name, last_name, email, company_name, current_role_title, created_at")
    .eq("master_profile_id", masterProfileId)
    .order("created_at", { ascending: true });
  if (!participants || participants.length === 0) return null;

  const { data: enrollmentRows } = await supabase
    .from("participant_sessions")
    .select("id, participant_id, session_id, completion_state, last_active_at, sessions(name)")
    .in("participant_id", participants.map((p) => p.id))
    .order("last_active_at", { ascending: false });

  let pairedProfileSummary: MasterProfileDetail["pairedProfileSummary"] = null;
  if (profile.paired_master_profile_id) {
    const { data: pairedParticipant } = await supabase
      .from("participants")
      .select("first_name, last_name")
      .eq("master_profile_id", profile.paired_master_profile_id)
      .limit(1)
      .maybeSingle();
    if (pairedParticipant) {
      pairedProfileSummary = { firstName: pairedParticipant.first_name, lastName: pairedParticipant.last_name };
    }
  }

  // Most recently created title among the linked registrations, per the
  // plan's "compute on read, don't store" decision.
  const mostRecentTitle = [...participants].reverse().find((p) => p.current_role_title)?.current_role_title ?? null;

  return {
    masterProfileId: profile.id,
    pairedMasterProfileId: profile.paired_master_profile_id,
    pairedProfileSummary,
    inferredRoleOverride: profile.inferred_role_override as "visionary" | "integrator" | null,
    inferredRole: inferRoleFromTitle(mostRecentTitle),
    participants: participants.map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      companyName: p.company_name,
      currentRoleTitle: p.current_role_title,
      createdAt: p.created_at,
    })),
    enrollments: (enrollmentRows ?? []).map((e) => ({
      participantSessionId: e.id,
      participantId: e.participant_id,
      sessionId: e.session_id,
      sessionName: (e.sessions as unknown as { name: string } | null)?.name ?? "[Deleted session]",
      completionState: e.completion_state,
      lastActiveAt: e.last_active_at,
    })),
  };
}

/** Resolve a participant by email to their master_profile_id, for the
 * merge control's "search for the target" step. */
export async function findMasterProfileIdByEmail(email: string): Promise<{
  masterProfileId: string;
  participantId: string;
  firstName: string;
  lastName: string;
} | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("participants")
    .select("id, first_name, last_name, master_profile_id")
    .ilike("email", email.trim())
    .maybeSingle();
  if (!data) return null;
  return {
    masterProfileId: data.master_profile_id,
    participantId: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
  };
}
