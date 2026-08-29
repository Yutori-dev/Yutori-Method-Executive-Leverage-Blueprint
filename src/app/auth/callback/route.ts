import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Magic-link landing target for participants (brief section 4.3).
 * Exchanges the PKCE code for a session, then routes to either profile
 * completion (first login, any device) or straight into the session they
 * clicked the link for (returning participant).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const joinCode = searchParams.get("join");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createServerSupabaseClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/?error=link_expired`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/?error=link_expired`);
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!participant) {
    const completeProfileUrl = new URL("/complete-profile", origin);
    if (joinCode) completeProfileUrl.searchParams.set("join", joinCode);
    return NextResponse.redirect(completeProfileUrl);
  }

  await supabase
    .from("participants")
    .update({ last_login: new Date().toISOString() })
    .eq("id", user.id);

  if (joinCode) {
    const { error: joinError } = await supabase.rpc("join_session", {
      p_join_code: joinCode,
    });
    if (joinError) {
      return NextResponse.redirect(`${origin}/?error=join_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
