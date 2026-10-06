"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MIN_LENGTH = 8;

function generatePassword() {
  // 14 chars from a UUID: plenty of entropy for a one-time handover password.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 14);
}

/**
 * Manual password reset by an admin, for a participant who forgot theirs
 * (the self-service email reset is waiting on the sending domain). Checks
 * that the CALLER is an admin with their own RLS-scoped session before ever
 * touching the service-role client. A blank password generates one and
 * returns it once so it can be passed on out of band; it is never logged or
 * stored by the app.
 */
export async function setParticipantPassword(params: { participantId: string; password?: string }) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const { data: callerIsAdmin } = await supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle();
  if (!callerIsAdmin) return { ok: false as const, message: "Only an admin can reset a password." };

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", params.participantId)
    .maybeSingle();
  if (!participant) return { ok: false as const, message: "Participant not found." };

  const typed = (params.password ?? "").trim();
  if (typed && typed.length < MIN_LENGTH) {
    return { ok: false as const, message: `Use at least ${MIN_LENGTH} characters.` };
  }
  const password = typed || generatePassword();

  const admin = createAdminSupabaseClient();
  const { error } = await admin.auth.admin.updateUserById(participant.id, { password });
  if (error) return { ok: false as const, message: error.message };

  return { ok: true as const, password: typed ? null : password };
}
