"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // Module 1 unlocks automatically for every new session -- only module 2
  // onward requires an explicit admin unlock (client feedback round 4).
  const { data: firstModule } = await supabase
    .from("modules")
    .select("id")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

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
      active_module_id: firstModule?.id ?? null,
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
  input: { name: string; organization: string; eventDate: string; format: SessionFormat },
) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("sessions")
    .update({
      name: input.name,
      organization: input.organization || null,
      event_date: input.eventDate || null,
      format: input.format,
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

export async function unlockWhiteWhale(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_unlock_white_whale", { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function unlockLeadershipWiring(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_unlock_leadership_wiring", { p_session_id: sessionId });
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
