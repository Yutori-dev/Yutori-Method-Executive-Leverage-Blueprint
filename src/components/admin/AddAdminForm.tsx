"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAdmin } from "@/lib/actions/admins";
import { Button } from "@/components/ui/Button";

export function AddAdminForm() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPassword(null);
    startTransition(async () => {
      const result = await addAdmin({ email, displayName });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage(`${email} can sign in at /admin/login with the password below.`);
      setPassword(result.password);
      setEmail("");
      setDisplayName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="admin-email" className="block text-xs font-medium text-(--color-ink-muted)">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
        <div>
          <label htmlFor="admin-name" className="block text-xs font-medium text-(--color-ink-muted)">
            Name
          </label>
          <input
            id="admin-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
      </div>
      <p className="text-xs text-(--color-ink-muted)">
        Entering an email that&apos;s already an admin resets their password instead of creating a
        duplicate account.
      </p>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add admin"}
        </Button>
        {message ? <p className="text-sm text-(--color-ink-muted)">{message}</p> : null}
      </div>

      {password ? (
        <div className="rounded-lg border border-(--color-hairline) px-3 py-2">
          <p className="text-xs text-(--color-ink-muted)">
            Password (shown once -- copy and share it now, it can&apos;t be shown again):
          </p>
          <code className="mt-1 block select-all font-mono text-sm text-(--color-ink)">{password}</code>
        </div>
      ) : null}
    </form>
  );
}
