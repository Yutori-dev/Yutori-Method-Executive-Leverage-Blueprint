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

  // participant_sessions doesn't depend on any of the other three results --
  // it only needs sessionId/user.id, which are already known -- so it runs
  // in the same round trip instead of waiting on them first.
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
        .select("id")
        .eq("session_id", sessionId)
        .eq("participant_id", user.id)
        .maybeSingle(),
    ]);

  if (!participant || !session || !modules || !participantSession) return null;

  const { data: progressRows } = await supabase
    .from("participant_module_progress")
    .select("module_id, status")
    .eq("participant_session_id", participantSession.id);

  const activeModule = modules.find((m) => m.id === session.active_module_id);
  const cohortActiveModuleSortOrder = activeModule ? activeModule.sort_order : null;

  const progressByModuleId = new Map<string, ModuleStatus>(
    (progressRows ?? []).map((row) => [row.module_id, row.status as ModuleStatus]),
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
