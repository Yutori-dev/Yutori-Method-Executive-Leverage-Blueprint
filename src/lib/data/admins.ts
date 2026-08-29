import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

/** RLS already scopes admin_users' select policy to admins only
 * (`admin_users_select`), so this runs as the signed-in caller's own
 * session -- a non-admin gets an empty result, not an error. */
export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("admin_users")
    .select("id, email, display_name, created_at")
    .order("created_at", { ascending: true });

  return (data ?? []).map((a) => ({
    id: a.id,
    email: a.email,
    displayName: a.display_name,
    createdAt: a.created_at,
  }));
}
