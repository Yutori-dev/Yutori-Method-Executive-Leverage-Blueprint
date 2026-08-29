"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Self-service admin provisioning (brief section 3.1: "future architecture
 * should not make additional admin accounts difficult to add"). Mirrors
 * scripts/create-admin.ts exactly -- find-or-create the auth user, then
 * upsert admin_users -- just reachable from the app instead of a local
 * script. Requires the CALLER to already be an admin, checked here with
 * their own RLS-scoped session before ever touching the service-role
 * client; admin_users itself has no insert policy for that scoped session,
 * so this check is the only thing standing between "any signed-in user"
 * and "can provision more admins."
 */
export async function addAdmin(params: { email: string; displayName: string }) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const { data: callerIsAdmin } = await supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle();
  if (!callerIsAdmin) return { ok: false as const, message: "Only an admin can add another admin." };

  const email = params.email.trim().toLowerCase();
  if (!email) return { ok: false as const, message: "Email is required." };

  const admin = createAdminSupabaseClient();

  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
  if (listError) return { ok: false as const, message: listError.message };

  let userId = existingUsers.users.find((u) => u.email?.toLowerCase() === email)?.id;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return { ok: false as const, message: createError?.message ?? "Could not create the account." };
    }
    userId = created.user.id;
  }

  const { error: upsertError } = await admin
    .from("admin_users")
    .upsert({ id: userId, email, display_name: params.displayName.trim() || null });

  if (upsertError) return { ok: false as const, message: upsertError.message };

  revalidatePath("/admin/admins");
  return { ok: true as const };
}
