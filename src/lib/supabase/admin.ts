import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS entirely -- use only for narrowly
 * scoped, deliberately privileged operations (provisioning an admin
 * account: scripts/create-admin.ts locally, src/lib/actions/admins.ts from
 * the app itself). Never import this from anything that handles a request
 * on behalf of an end user, and every caller must itself re-check the
 * caller is already an admin first -- this client has no authorization
 * boundary of its own, same caveat as every SECURITY DEFINER RPC in this
 * app.
 */
export function createAdminSupabaseClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
