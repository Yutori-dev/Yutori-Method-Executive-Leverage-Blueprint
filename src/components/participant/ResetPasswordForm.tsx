"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/lib/actions/passwordReset";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErrorMessage(null);
        startTransition(async () => {
          // On success the action redirects, so a returned value is always a failure.
          const result = await updatePassword({ password, confirmPassword });
          if (result && !result.ok) setErrorMessage(result.message);
        });
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-(--color-ink-muted)">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-medium text-(--color-ink-muted)">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Save new password"}
      </Button>
    </form>
  );
}
