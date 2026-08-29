import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deriveModuleState, type ModuleDisplayState } from "@/lib/moduleState";
import type { ModuleStatus } from "@/types/database";

export interface DashboardModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sortOrder: number;
  requiresLiveWorkshop: boolean;
  state: ModuleDisplayState;
}

export interface ParticipantDashboardData {
  participant: { firstName: string; lastName: string };
  session: { id: string; name: string; organization: string | null; status: string };
  participantSessionId: string;
  modules: DashboardModule[];
}

export async function getParticipantDashboard(
  sessionId: string,
): Promise<ParticipantDashboardData | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Every one of these four only needs sessionId/user.id, which are already
  // known, so they all run in a single round trip instead of one waiting on
  // another. participant_module_progress is embedded directly into the
  // participant_sessions query (a one-to-many join PostgREST resolves
  // server-side) instead of being a fifth, separate request -- this loader
  // runs on every page in the app, and under concurrent load, request count
  // matters as much as round-trip depth: each request is a connection
  // competing for PostgREST's pool to Postgres (see docs/TESTING.md's load
  // test writeup).
  const [{ data: participant }, { data: session }, { data: modules }, { data: participantSession }] =
    await Promise.all([
      supabase.from("participants").select("first_name, last_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("sessions")
        .select("id, name, organization, status, active_module_id")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase.from("modules").select("*").eq("active", true).order("sort_order", { ascending: true }),
      supabase
        .from("participant_sessions")
        .select("id, participant_module_progress(module_id, status)")
        .eq("session_id", sessionId)
        .eq("participant_id", user.id)
        .maybeSingle(),
    ]);

  if (!participant || !session || !modules || !participantSession) return null;

  const activeModule = modules.find((m) => m.id === session.active_module_id);
  const cohortActiveModuleSortOrder = activeModule ? activeModule.sort_order : null;

  const progressByModuleId = new Map<string, ModuleStatus>(
    (participantSession.participant_module_progress ?? []).map((row) => [
      row.module_id,
      row.status as ModuleStatus,
    ]),
  );

  const dashboardModules: DashboardModule[] = modules.map((module) => ({
    id: module.id,
    key: module.key,
    name: module.name,
    description: module.description,
    sortOrder: module.sort_order,
    requiresLiveWorkshop: module.requires_live_workshop,
    state: deriveModuleState({
      moduleSortOrder: module.sort_order,
      requiresLiveWorkshop: module.requires_live_workshop,
      cohortActiveModuleSortOrder,
      participantStatus: progressByModuleId.get(module.id) ?? null,
    }),
  }));

  return {
    participant: { firstName: participant.first_name, lastName: participant.last_name },
    session: { id: session.id, name: session.name, organization: session.organization, status: session.status },
    participantSessionId: participantSession.id,
    modules: dashboardModules,
  };
}
