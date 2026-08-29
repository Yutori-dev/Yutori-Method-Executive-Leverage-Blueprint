"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/**
 * Temporary email+password auth (see docs/ARCHITECTURE_DECISIONS.md) --
 * admins never self-register, so this is sign-in only. Accounts and their
 * initial/reset password are provisioned via /admin/admins or
 * `npm run seed:admin`. Since signInWithPassword succeeds for ANY
 * password-holding account (participants included), an is_admin() check
 * after sign-in replaces what the old magic-link callback route used to
 * do -- a non-admin's valid credentials still get signed back out here.
 */
export function AdminLoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setErrorMessage("Incorrect email or password.");
      setSubmitting(false);
      return;
    }

    const { data: isAdmin } = await supabase.rpc("is_admin");

    if (!isAdmin) {
      await supabase.auth.signOut();
      setErrorMessage("This account is not an admin.");
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-(--color-ink-muted)">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-(--color-ink-muted)">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>
      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
