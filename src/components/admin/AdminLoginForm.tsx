"use client";

import { useState } from "react";
import { signInAdmin } from "@/lib/actions/adminAuth";
import { Button } from "@/components/ui/Button";

/**
 * Temporary email+password auth (see docs/ARCHITECTURE_DECISIONS.md) --
 * admins never self-register, so this is sign-in only. Accounts and their
 * initial/reset password are provisioned via /admin/admins or
 * `npm run seed:admin`. Since signInWithPassword succeeds for ANY
 * password-holding account (participants included), an is_admin() check
 * after sign-in replaces what the old magic-link callback route used to
 * do -- a non-admin's valid credentials still get signed back out here.
 *
 * Sign-in itself runs as a Server Action (signInAdmin) rather than through
 * the browser client -- see that function's comment for why.
 */
export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    // A successful sign-in never returns here -- signInAdmin redirects from
    // inside the server action instead. Only a failure result reaches here.
    const result = await signInAdmin({ email, password });
    setErrorMessage(result.message);
    setSubmitting(false);
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
