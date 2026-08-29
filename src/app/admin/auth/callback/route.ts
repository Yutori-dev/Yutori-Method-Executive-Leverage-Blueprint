import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=link_expired`);
  }

  const supabase = await createServerSupabaseClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/admin/login?error=link_expired`);
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/login?error=not_authorized`);
  }

  return NextResponse.redirect(`${origin}/admin`);
}
