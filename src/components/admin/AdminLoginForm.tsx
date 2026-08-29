"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function AdminLoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setSending(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setSending(false);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <p className="text-(--color-ink)">Check your email.</p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          We sent a secure sign-in link to <strong>{email}</strong>.
        </p>
      </div>
    );
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
      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}
      <Button type="submit" disabled={sending} className="w-full">
        {sending ? "Sending link..." : "Send sign-in link"}
      </Button>
    </form>
  );
}
