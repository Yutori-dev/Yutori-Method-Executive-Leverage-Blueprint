"use client";

import { useState, useTransition } from "react";
import { setParticipantPassword } from "@/lib/actions/participantPassword";
import { Button } from "@/components/ui/Button";

/** Manual password reset for one registration. Leave the box blank to have a
 * password generated (shown once); the participant can keep it or you can
 * set one you choose. */
export function ResetPasswordControl({ participantId }: { participantId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState<{ generated: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
      >
        Reset password
      </button>
    );
  }

  if (done) {
    return (
      <div className="mt-2 rounded-lg border border-(--color-hairline) bg-(--color-accent-soft) p-3 text-sm">
        <p className="text-(--color-ink)">Password updated. They can sign in with it straight away.</p>
        {done.generated ? (
          <p className="mt-2 text-(--color-ink)">
            New password: <span className="font-mono">{done.generated}</span>
            <span className="block text-xs text-(--color-ink-muted)">Shown once. Pass it on securely.</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setDone(null);
            setPassword("");
          }}
          className="mt-2 text-xs text-(--color-ink-muted) underline underline-offset-4"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-(--color-hairline) bg-(--color-accent-soft) p-3">
      <label className="block text-xs text-(--color-ink-muted)">New password (leave blank to generate one)</label>
      <input
        type="text"
        autoComplete="off"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
      />
      {errorMessage ? <p className="mt-2 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            setPassword("");
            setErrorMessage(null);
          }}
        >
          Cancel
        </Button>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setErrorMessage(null);
              const result = await setParticipantPassword({ participantId, password });
              if (!result.ok) {
                setErrorMessage(result.message);
                return;
              }
              setDone({ generated: result.password });
              setPassword("");
            })
          }
        >
          {isPending ? "Saving..." : "Set password"}
        </Button>
      </div>
    </div>
  );
}
