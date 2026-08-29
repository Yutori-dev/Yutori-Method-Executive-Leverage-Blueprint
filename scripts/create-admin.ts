/**
 * Provisions a facilitator/admin account (brief section 3.1 -- initially
 * Nicole and Valerie). Run once per admin:
 *
 *   npm run seed:admin -- you@example.com "Your Name"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment -- this is the one
 * place in the codebase that is meant to use it. Never run this against
 * production from a machine you don't trust, and never commit the key.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, displayName] = process.argv.slice(2);

  if (!email) {
    console.error('Usage: npm run seed:admin -- you@example.com "Your Name"');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  let userId = existing.users.find((u) => u.email === email)?.id;
  const password = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error("Failed to create auth user:", error?.message);
      process.exit(1);
    }
    userId = data.user.id;
  } else {
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });
    if (updateError) {
      console.error("Failed to set password:", updateError.message);
      process.exit(1);
    }
  }

  const { error: upsertError } = await supabase
    .from("admin_users")
    .upsert({ id: userId, email, display_name: displayName ?? null });

  if (upsertError) {
    console.error("Failed to upsert admin_users row:", upsertError.message);
    process.exit(1);
  }

  console.log(`${email} is now an admin. Password (shown once): ${password}`);
  console.log("They can sign in at /admin/login.");
}

main();
