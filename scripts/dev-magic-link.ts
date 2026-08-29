/**
 * Prints a real, working sign-in link for an email WITHOUT sending an
 * email -- sidesteps Supabase's built-in email rate limit (2/hour on the
 * free tier with no custom SMTP configured) entirely during manual testing.
 *
 * Usage:
 *   npm run dev:magic-link -- you@example.com
 *   npm run dev:magic-link -- you@example.com --join DEV-PREVIEW
 *   npm run dev:magic-link -- you@example.com --admin
 *
 * Paste the printed link straight into a browser. Requires
 * SUPABASE_SERVICE_ROLE_KEY -- local/dev use only, never expose this script
 * or its output to anything but your own terminal.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  const joinCode = (() => {
    const i = args.indexOf("--join");
    return i >= 0 ? args[i + 1] : undefined;
  })();
  const isAdmin = args.includes("--admin");

  if (!email) {
    console.error(
      "Usage: npm run dev:magic-link -- you@example.com [--join CODE] [--admin]",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const redirectPath = isAdmin
    ? "/admin/auth/dev-callback"
    : `/auth/dev-callback${joinCode ? `?join=${encodeURIComponent(joinCode)}` : ""}`;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}${redirectPath}` },
  });

  if (error || !data.properties?.action_link) {
    console.error("Failed to generate link:", error?.message);
    process.exit(1);
  }

  console.log(`\nSign-in link for ${email}${isAdmin ? " (admin)" : ""}:\n`);
  console.log(data.properties.action_link);
  console.log("\nOpen it directly in a browser -- no email required.\n");
}

main();
