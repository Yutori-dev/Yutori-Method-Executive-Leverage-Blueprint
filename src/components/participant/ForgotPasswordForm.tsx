"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/lib/actions/passwordReset";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm({ expiredLink }: { expiredLink: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (message?.ok) {
    return <p className="text-sm text-(--color-ink)">{message.text}</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await requestPasswordReset({ email });
          setMessage({ ok: result.ok, text: result.message });
        });
      }}
      className="space-y-4"
    >
      {expiredLink ? (
        <p className="text-sm text-[#8a3324]">
          That reset link has expired or was already used. Enter your email to get a new one.
        </p>
      ) : (
        <p className="text-sm text-(--color-ink-muted)">
          Enter the email you signed up with and we&apos;ll send you a link to choose a new
          password. You&apos;ll keep everything on your account.
        </p>
      )}

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

      {message && !message.ok ? <p className="text-sm text-[#8a3324]">{message.text}</p> : null}

      <Button type="submit" disabled={isPending || !email.trim()} className="w-full">
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
