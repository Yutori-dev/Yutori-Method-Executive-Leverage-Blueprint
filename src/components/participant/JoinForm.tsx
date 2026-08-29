"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { savePendingProfile } from "@/lib/pendingProfile";
import { Button } from "@/components/ui/Button";

type Status = "checking" | "form" | "sending" | "sent" | "already-signed-in" | "error";

export function JoinForm({ joinCode }: { joinCode: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!data.user) {
        setStatus("form");
        return;
      }

      setStatus("already-signed-in");
      const { error } = await supabase.rpc("join_session", { p_join_code: joinCode });
      if (cancelled) return;

      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }

      router.push("/dashboard");
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setErrorMessage(null);
    setStatus("sending");

    savePendingProfile({ email, firstName, lastName, joinCode });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?join=${encodeURIComponent(joinCode)}`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("form");
      return;
    }

    setStatus("sent");
  }

  if (status === "checking" || status === "already-signed-in") {
    return <p className="text-sm text-(--color-ink-muted)">One moment...</p>;
  }

  if (status === "sent") {
    return (
      <div>
        <p className="text-(--color-ink)">Check your email.</p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          We sent a secure sign-in link to <strong>{email}</strong>. Open it on any device to
          continue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-xs font-medium text-(--color-ink-muted)">
            First name
          </label>
          <input
            id="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-xs font-medium text-(--color-ink-muted)">
            Last name
          </label>
          <input
            id="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
      </div>
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

      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? "Sending link..." : "Continue"}
      </Button>
      <p className="text-xs text-(--color-ink-muted)">
        No password needed. We&apos;ll email you a secure link to continue.
      </p>
    </form>
  );
}
