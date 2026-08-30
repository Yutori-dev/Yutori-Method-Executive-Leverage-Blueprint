"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Shared by both the admin and participant sign-out buttons. Clears the
 * cookie and redirects in one server response -- same reasoning as
 * adminAuth.ts's signInAdmin -- rather than a client-side signOut()
 * followed by router.push(), which left a gap where navigation could
 * outrun the browser's cookie write. */
export async function signOut(redirectTo: string) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(redirectTo);
}
