"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ALWAYS_UNLOCKED_MODULE_KEYS } from "@/lib/moduleState";
import { orderModulesForSession } from "@/lib/moduleOrder";
import type { SessionFormat, SessionStatus, FollowUpStatus } from "@/types/database";

function slugifyJoinCode(name: string) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "SESSION"}-${suffix}`;
}

export async function createSession(input: {
  name: string;
  organization: string;
  eventDate: string;
  format: SessionFormat;
  disabledModuleKeys?: string[];
  skipDelegationBeliefs?: boolean;
  showModulesToEveryone?: boolean;
  /** Module keys in the order participants complete them. */
  moduleOrder?: string[];
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const disabledModuleKeys = input.disabledModuleKeys ?? [];

  // Module 1 unlocks automatically for every new session -- only module 2
  // onward requires an explicit admin unlock (client feedback round 4).
  // Skip any module disabled for this session so a shortened workshop
  // doesn't open on a module that isn't running.
  const { data: firstModule } = await supabase
    .from("modules")
    .select("id, key, sort_order")
    .eq("active", true)
    .eq("requires_live_workshop", false)
    .order("sort_order", { ascending: true });
  // The EA Experience Assessment is always open to participants on its own
  // (never cohort-unlocked), so it must not take the "module 1 auto-unlocks"
  // slot -- that stays with the first real workshop module.
  const firstEnabledModule = orderModulesForSession(firstModule ?? [], input.moduleOrder).find(
    (m) => !disabledModuleKeys.includes(m.key) && !ALWAYS_UNLOCKED_MODULE_KEYS.has(m.key),
  );

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      name: input.name,
      organization: input.organization || null,
      event_date: input.eventDate || null,
      format: input.format,
      status: "draft",
      join_code: slugifyJoinCode(input.name),
      created_by: user.id,
      active_module_id: firstEnabledModule?.id ?? null,
      disabled_module_keys: disabledModuleKeys,
      skip_delegation_beliefs: input.skipDelegationBeliefs ?? false,
      show_modules_to_everyone: input.showModulesToEveryone ?? false,
      module_order: input.moduleOrder && input.moduleOrder.length > 0 ? input.moduleOrder : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create session.");
  }

  revalidatePath("/admin");
  return data.id as string;
}

export async function updateSession(
  sessionId: string,
  input: {
    name: string;
    organization: string;
    eventDate: string;
    format: SessionFormat;
    disabledModuleKeys?: string[];
    skipDelegationBeliefs?: boolean;
    showModulesToEveryone?: boolean;
    moduleOrder?: string[];
  },
) {
  const supabase = await createServerSupabaseClient();

  // Which module is "open" is a pointer into the session's order, so moving
  // modules around would otherwise open (or close) whatever now sits before
  // the pointer. When the order changes, move the pointer so nothing that was
  // closed becomes open: it stops just before the first module that was not
  // open before the change. Facilitators then use Unlock next as usual.
  let activeModuleId: string | null | undefined;
  if (input.moduleOrder !== undefined) {
    const [{ data: current }, { data: allModules }] = await Promise.all([
      supabase.from("sessions").select("active_module_id, module_order, disabled_module_keys").eq("id", sessionId).single(),
      supabase.from("modules").select("id, key, sort_order").eq("active", true),
    ]);
    if (current?.active_module_id && allModules) {
      const wasDisabled = new Set(current.disabled_module_keys ?? []);
      const before = orderModulesForSession(allModules, current.module_order).filter((m) => !wasDisabled.has(m.key));
      const pointer = before.findIndex((m) => m.id === current.active_module_id);
      if (pointer !== -1) {
        const wasOpen = new Set(before.slice(0, pointer + 1).map((m) => m.key));
        const nowDisabled = new Set(input.disabledModuleKeys ?? current.disabled_module_keys ?? []);
        const after = orderModulesForSession(allModules, input.moduleOrder).filter((m) => !nowDisabled.has(m.key));
        let last: string | null = null;
        for (const m of after) {
          if (!wasOpen.has(m.key)) break;
          last = m.id;
        }
        activeModuleId = last;
      }
    }
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      ...(activeModuleId !== undefined ? { active_module_id: activeModuleId } : {}),
      name: input.name,
      organization: input.organization || null,
      event_date: input.eventDate || null,
      format: input.format,
      // Undefined means the edit form didn't touch module selection --
      // leave whatever was already set rather than wiping it back to "all
      // enabled".
      ...(input.disabledModuleKeys !== undefined
        ? { disabled_module_keys: input.disabledModuleKeys }
        : {}),
      ...(input.skipDelegationBeliefs !== undefined
        ? { skip_delegation_beliefs: input.skipDelegationBeliefs }
        : {}),
      ...(input.showModulesToEveryone !== undefined
        ? { show_modules_to_everyone: input.showModulesToEveryone }
        : {}),
      ...(input.moduleOrder !== undefined
        ? { module_order: input.moduleOrder.length > 0 ? input.moduleOrder : null }
        : {}),
    })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/admin");
}

export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("sessions").update({ status }).eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/admin");
}

export async function unlockNextModule(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_unlock_next_module", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function revealArchitecture(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_reveal_architecture", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function releaseWorkshopFeedback(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_release_workshop_feedback", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function revealBlueprint(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_reveal_blueprint", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath(`/dashboard/${sessionId}`);
}

/** Undo a Blueprint reveal for one session (e.g. it was switched on too early
 * and is distracting from the modules). Participants stop seeing the link
 * straight away; revealing again works as before. */
export async function hideBlueprint(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("sessions").update({ blueprint_revealed: false }).eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath(`/dashboard/${sessionId}`);
}

export async function revealPriorityLeverage(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_reveal_priority_leverage", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function revealZoneOfInvestment(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_reveal_zone_of_investment", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function updateFollowUpStatus(params: {
  followUpId: string;
  status: FollowUpStatus;
  sessionId: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("follow_up_interests")
    .update({ status: params.status })
    .eq("id", params.followUpId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${params.sessionId}/follow-up`);
}

/** Permanent delete, admin-only via RLS (sessions_write_admin covers `for
 * all`, no separate RPC needed -- matches the "plain authenticated write"
 * pattern already used for admin config saves elsewhere in this app).
 * Every dependent row (participant_sessions and everything cascading from
 * that -- ratings, PDOs, architecture recommendations, etc.) already has
 * `on delete cascade` back to sessions.id. The UI requires typing DELETE
 * before this is callable -- see DeleteSessionControl.tsx. */
export async function deleteSession(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/admin");
  return { ok: true as const };
}
