"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Both actions run entirely server-side (sign up/in, any follow-up RPC,
 * and the redirect) so the auth cookie write and the navigation are part
 * of the same response -- see adminAuth.ts's signInAdmin for why that
 * matters (a client-side signInWithPassword() + router.push() left a gap
 * where navigation could fire before the browser had actually persisted
 * the new session cookie, intermittently landing on a stuck or
 * signed-out-again page).
 */

export async function signUpParticipant(input: { email: string; password: string; joinCode: string }) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });

  if (error) {
    return {
      ok: false as const,
      message: /already registered|already exists/i.test(error.message)
        ? 'An account with this email already exists. Use "Sign in" below instead.'
        : error.message,
    };
  }

  if (!data.session) {
    // No confirmation email is sent in this temporary setup, so a missing
    // session here means this email is already registered (Supabase's
    // anti-enumeration response to a duplicate signUp).
    return {
      ok: false as const,
      message: 'An account with this email already exists. Use "Sign in" below instead.',
    };
  }

  redirect(input.joinCode ? `/complete-profile?join=${encodeURIComponent(input.joinCode)}` : "/complete-profile");
}

export async function signInParticipant(input: { email: string; password: string; joinCode: string }) {
  const supabase = await createServerSupabaseClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError) {
    return { ok: false as const, message: "Incorrect email or password." };
  }

  // Same account can be both an admin and a participant -- rather than
  // asking which kind of account this is, detect it after auth and route
  // accordingly.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) {
    redirect("/admin");
  }

  if (input.joinCode) {
    const { error } = await supabase.rpc("join_session", { p_join_code: input.joinCode });
    if (error) {
      return { ok: false as const, message: error.message };
    }
  }

  redirect("/dashboard");
}
