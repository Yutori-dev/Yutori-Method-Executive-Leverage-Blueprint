import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Landing point for the link in a password-reset email. Supports both link
 * shapes Supabase can send:
 *
 *  - token_hash + type (verifyOtp): works even when the email is opened on a
 *    different device or browser than the one that asked for the reset --
 *    the common case, e.g. requesting on a phone and opening on a laptop.
 *    Requires the recovery email template to link here; see
 *    docs/PASSWORD_RESET_SETUP.md.
 *  - code (PKCE exchange): what the default template produces. Only works
 *    in the same browser that requested the reset, because the code
 *    verifier lives in a cookie set at request time.
 */

/** Only ever redirect to a path on this site -- never an attacker-supplied
 * absolute URL smuggled in through ?next=. */
function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
  return "/reset-password";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createServerSupabaseClient();
  let error: unknown = null;

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = new Error("Missing token.");
  }

  if (error) {
    return NextResponse.redirect(new URL("/forgot-password?error=expired", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
