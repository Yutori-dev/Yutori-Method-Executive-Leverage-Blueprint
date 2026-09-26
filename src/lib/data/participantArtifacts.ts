import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Read-only, artifact-viewing access resolved across a person's whole
 * master profile -- i.e. including sessions enrolled under a different
 * email an admin has merged into the same profile. Deliberately separate
 * from getParticipantDashboard (which runs on every page load and is
 * strictly the caller's own participant_id): live-session interaction
 * (module pages, intake, feedback) must stay self-scoped, because writes
 * are self-scoped by RLS -- a merged sibling can READ another
 * registration's session but couldn't answer its questions, so routing
 * live interaction through this would produce a confusing half-working
 * experience. This is only for viewing finished artifacts.
 */

export interface PortalSession {
  sessionId: string;
  participantSessionId: string;
  name: string;
  organization: string | null;
  status: string;
  blueprintRevealed: boolean;
  lastActiveAt: string;
  ownedByCaller: boolean;
}

export async function getPortalSessions(): Promise<PortalSession[] | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("participants")
    .select("master_profile_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me) return [];

  const { data: siblings } = await supabase
    .from("participants")
    .select("id")
    .eq("master_profile_id", me.master_profile_id);
  const participantIds = (siblings ?? []).map((s) => s.id);
  if (participantIds.length === 0) return [];

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id, participant_id, session_id, last_active_at")
    .in("participant_id", participantIds)
    .order("last_active_at", { ascending: false });
  if (!enrollments || enrollments.length === 0) return [];

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, organization, status, blueprint_revealed")
    .in("id", [...new Set(enrollments.map((e) => e.session_id))]);
  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));

  const portalSessions: PortalSession[] = [];
  for (const e of enrollments) {
    const s = sessionById.get(e.session_id);
    if (!s) continue;
    portalSessions.push({
      sessionId: s.id,
      participantSessionId: e.id,
      name: s.name,
      organization: s.organization,
      status: s.status,
      blueprintRevealed: s.blueprint_revealed,
      lastActiveAt: e.last_active_at,
      ownedByCaller: e.participant_id === user.id,
    });
  }
  return portalSessions;
}

export interface ArtifactAccess {
  participantSessionId: string;
  participantName: string;
  sessionStatus: string;
  blueprintRevealed: boolean;
}

/** Resolve one specific session's Blueprint access for the caller,
 * through their master profile. Null if the caller (or any merged
 * registration of the same person) isn't enrolled in that session. */
export async function getArtifactAccess(sessionId: string): Promise<ArtifactAccess | null> {
  const all = await getPortalSessions();
  if (!all) return null;
  const match = all.find((s) => s.sessionId === sessionId);
  if (!match) return null;

  const supabase = await createServerSupabaseClient();
  const { data: enrollment } = await supabase
    .from("participant_sessions")
    .select("participants(first_name, last_name)")
    .eq("id", match.participantSessionId)
    .maybeSingle();
  const participant = enrollment?.participants as unknown as { first_name: string; last_name: string } | null;

  return {
    participantSessionId: match.participantSessionId,
    participantName: participant ? `${participant.first_name} ${participant.last_name}` : "",
    sessionStatus: match.status,
    blueprintRevealed: match.blueprintRevealed,
  };
}
