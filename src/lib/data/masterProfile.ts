import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { inferRoleFromTitle, type InferredRole } from "@/lib/inferRole";
import { formatCurrentSupport } from "@/lib/currentSupportLabels";

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
  /** Override if an admin set one, else inferred from the most recent title
   * across every linked registration. Null when neither applies. */
  role: InferredRole | null;
  roleIsManual: boolean;
}

export type RoleFilter = InferredRole | "unclassified";

// A request URL carries every id in an .in() filter; a few hundred UUIDs
// exceed common URL limits. Chunk instead of assuming a small cohort.
const ID_CHUNK = 50;
async function inChunks<T>(ids: string[], run: (chunk: string[]) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const { data } = await run(ids.slice(i, i + ID_CHUNK));
    if (data) out.push(...data);
  }
  return out;
}

export async function searchMasterProfiles(params: {
  query?: string;
  sessionId?: string;
  role?: RoleFilter;
}): Promise<MasterProfileListRow[]> {
  const supabase = await createServerSupabaseClient();
  const { query, sessionId, role } = params;

  let allowedProfileIds: string[] | null = null;

  if (sessionId) {
    const { data: enrolled } = await supabase
      .from("participant_sessions")
      .select("participant_id")
      .eq("session_id", sessionId);
    const participantIds = (enrolled ?? []).map((e) => e.participant_id);
    if (participantIds.length === 0) return [];
    const profilesForSession = await inChunks(participantIds, (ids) =>
      supabase.from("participants").select("master_profile_id").in("id", ids),
    );
    allowedProfileIds = [...new Set(profilesForSession.map((p) => p.master_profile_id))];
    if (allowedProfileIds.length === 0) return [];
  }

  if (query && query.trim()) {
    const term = query.trim().replace(/[%_,()]/g, "");
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

  const rows = allowedProfileIds
    ? await inChunks(allowedProfileIds, (ids) =>
        supabase
          .from("participants")
          .select("id, first_name, last_name, email, master_profile_id, current_role_title, created_at")
          .in("master_profile_id", ids)
          .order("created_at", { ascending: false }),
      )
    : ((
        await supabase
          .from("participants")
          .select("id, first_name, last_name, email, master_profile_id, current_role_title, created_at")
          .order("created_at", { ascending: false })
          .limit(1000)
      ).data ?? []);
  if (rows.length === 0) return [];

  // Newest registration first, so the first title found is the most recent.
  const titleByProfile = new Map<string, string>();
  const byProfile = new Map<string, MasterProfileListRow>();
  for (const r of rows.sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const entry = byProfile.get(r.master_profile_id) ?? {
      masterProfileId: r.master_profile_id,
      participants: [],
      sessionCount: 0,
      role: null,
      roleIsManual: false,
    };
    entry.participants.push({ id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email });
    byProfile.set(r.master_profile_id, entry);
    if (r.current_role_title && !titleByProfile.has(r.master_profile_id)) {
      titleByProfile.set(r.master_profile_id, r.current_role_title);
    }
  }

  const [sessionCounts, overrides] = await Promise.all([
    inChunks(rows.map((r) => r.id), (ids) =>
      supabase.from("participant_sessions").select("participant_id").in("participant_id", ids),
    ),
    inChunks([...byProfile.keys()], (ids) =>
      supabase.from("master_profiles").select("id, inferred_role_override").in("id", ids),
    ),
  ]);
  const countByParticipant = new Map<string, number>();
  for (const s of sessionCounts) {
    countByParticipant.set(s.participant_id, (countByParticipant.get(s.participant_id) ?? 0) + 1);
  }
  const overrideByProfile = new Map(overrides.map((o) => [o.id, o.inferred_role_override as InferredRole | null]));

  for (const entry of byProfile.values()) {
    entry.sessionCount = entry.participants.reduce((sum, p) => sum + (countByParticipant.get(p.id) ?? 0), 0);
    const override = overrideByProfile.get(entry.masterProfileId) ?? null;
    entry.role = override ?? inferRoleFromTitle(titleByProfile.get(entry.masterProfileId));
    entry.roleIsManual = override !== null;
  }

  const filtered = [...byProfile.values()].filter((entry) => {
    if (!role) return true;
    return role === "unclassified" ? entry.role === null : entry.role === role;
  });

  return filtered.sort((a, b) => a.participants[0].lastName.localeCompare(b.participants[0].lastName));
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
    currentSupport: string;
    wholeBusinessOs: string | null;
    intakeCompletedAt: string | null;
    privacyConsentGivenAt: string | null;
    privacyConsentVersion: string | null;
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
    .select("id, first_name, last_name, email, company_name, current_role_title, created_at, intake_completed_at, privacy_consent_given_at, privacy_consent_version, whole_business_os, whole_business_os_other_text, current_support_personal_assistant, current_support_admin_or_va, current_support_executive_assistant, current_support_senior_executive_assistant, current_support_head_of_operations, current_support_chief_of_staff, current_support_chief_integrator, current_support_coo, current_support_ai_automation, current_support_other, current_support_other_text, current_support_none")
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
      currentSupport: formatCurrentSupport({
        currentSupportPersonalAssistant: p.current_support_personal_assistant,
        currentSupportAdminOrVa: p.current_support_admin_or_va,
        currentSupportExecutiveAssistant: p.current_support_executive_assistant,
        currentSupportSeniorExecutiveAssistant: p.current_support_senior_executive_assistant,
        currentSupportHeadOfOperations: p.current_support_head_of_operations,
        currentSupportChiefOfStaff: p.current_support_chief_of_staff,
        currentSupportChiefIntegrator: p.current_support_chief_integrator,
        currentSupportCoo: p.current_support_coo,
        currentSupportAiAutomation: p.current_support_ai_automation,
        currentSupportOther: p.current_support_other,
        currentSupportOtherText: p.current_support_other_text,
        currentSupportNone: p.current_support_none,
      }),
      wholeBusinessOs: p.whole_business_os
        ? p.whole_business_os + (p.whole_business_os_other_text ? ` (${p.whole_business_os_other_text})` : "")
        : null,
      intakeCompletedAt: p.intake_completed_at,
      privacyConsentGivenAt: p.privacy_consent_given_at,
      privacyConsentVersion: p.privacy_consent_version,
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
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (!data) return null;
  return {
    masterProfileId: data.master_profile_id,
    participantId: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
  };
}
