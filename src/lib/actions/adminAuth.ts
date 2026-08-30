"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Signing in via a Server Action (rather than the browser client + a
 * client-side router.push) makes the auth cookie write and the redirect
 * part of the same server response -- there is no client-side gap where a
 * navigation can fire before the browser has actually persisted the new
 * session cookie. That gap was the root cause of a reported bug: the
 * signed-in header would render (a later request picked up the cookie)
 * while the page itself stayed on the login form until a manual reload.
 */
export async function signInAdmin(input: { email: string; password: string }) {
  const supabase = await createServerSupabaseClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError) {
    return { ok: false as const, message: "Incorrect email or password." };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    await supabase.auth.signOut();
    return { ok: false as const, message: "This account is not an admin." };
  }

  redirect("/admin");
}
