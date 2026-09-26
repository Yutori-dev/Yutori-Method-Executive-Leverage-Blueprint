"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Self-service password recovery (client brief 2026-09, item 1). Resetting
 * the password on an existing account keeps everything attached to it --
 * the auth user, its participants row, its master profile, every past
 * session -- because nothing about the account's identity changes, only its
 * credential. That is what lets someone who attended a virtual session come
 * back for an in-person one and log into the same account.
 *
 * Needs real email delivery to work end to end: see
 * docs/PASSWORD_RESET_SETUP.md for the domain / SMTP / redirect allow-list
 * steps that have to happen on the Supabase and DNS side.
 */

// Same floor signup enforces (JoinForm's minLength) so a reset can't be used
// to set a password the signup form itself would have refused.
const MIN_PASSWORD_LENGTH = 6;

async function getSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function requestPasswordReset(input: { email: string }) {
  const email = input.email.trim();
  if (!email) return { ok: false as const, message: "Enter your email address." };

  const supabase = await createServerSupabaseClient();
  const origin = await getSiteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Deliberately identical for an address that has an account and one that
  // doesn't -- otherwise this form becomes a way to check who is registered.
  // The one error worth surfacing is Supabase's email rate limit, which says
  // nothing about whether the address exists.
  if (error && /rate limit|too many/i.test(error.message)) {
    return {
      ok: false as const,
      message: "Too many reset requests right now. Please wait a few minutes and try again.",
    };
  }

  return {
    ok: true as const,
    message: "If an account exists for that email, we've sent a link to reset your password.",
  };
}

export async function updatePassword(input: { password: string; confirmPassword: string }) {
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false as const, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false as const, message: "Those passwords don't match." };
  }

  const supabase = await createServerSupabaseClient();

  // Only reachable with the short-lived recovery session the emailed link
  // establishes; without one there is nobody to change the password for.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      message: "This reset link has expired or was already used. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) {
    return {
      ok: false as const,
      message: /same password|different from the old/i.test(error.message)
        ? "Choose a password you haven't used on this account before."
        : error.message,
    };
  }

  // Same routing rule as signInParticipant: one account can be both an
  // admin and a participant, so detect it rather than ask.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  redirect(isAdmin ? "/admin" : "/dashboard");
}
