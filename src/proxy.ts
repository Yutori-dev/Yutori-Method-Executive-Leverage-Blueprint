import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Runs on every request. Two jobs:
 *  1. Refresh the Supabase auth cookie so server components always see a
 *     valid session (the standard @supabase/ssr middleware pattern).
 *  2. Gate /admin/** and /dashboard/** server-side, since frontend route
 *     guards alone are not sufficient (task instructions section 12).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminAuthRoute = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/auth");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isCompleteProfileRoute = pathname.startsWith("/complete-profile");

  if (isAdminRoute && !isAdminAuthRoute) {
    if (!user) {
      const redirectUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      const redirectUrl = new URL("/admin/login", request.url);
      redirectUrl.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(redirectUrl);
    }
  }

  if ((isDashboardRoute || isCompleteProfileRoute) && !user) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("error", "sign_in_required");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/complete-profile/:path*",
  ],
};
