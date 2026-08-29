"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionFormat, SessionStatus } from "@/types/database";

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
