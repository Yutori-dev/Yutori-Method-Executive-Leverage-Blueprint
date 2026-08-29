import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS entirely -- use only for narrowly
 * scoped, deliberately privileged operations (e.g. provisioning an admin
 * account in scripts/create-admin.ts). Never import this from anything that
 * handles a request on behalf of an end user.
 */
export function createAdminSupabaseClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
