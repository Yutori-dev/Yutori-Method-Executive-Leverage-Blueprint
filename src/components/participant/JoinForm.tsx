"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { savePendingProfile } from "@/lib/pendingProfile";
import { signUpParticipant, signInParticipant } from "@/lib/actions/participantAuth";
import { Button } from "@/components/ui/Button";

type Status = "checking" | "form" | "submitting" | "already-signed-in" | "error";
type Mode = "create" | "signin";

/**
 * Temporary email+password auth for participants -- replaces the magic
 * link (supabase.auth.signInWithOtp) so signup needs zero email delivery,
 * routing around Resend/Supabase's free-tier rate limit. Revert to magic
 * link once that's resolved (see supabase/config.toml's enable_confirmations
 * comment and docs/ARCHITECTURE_DECISIONS.md).
 */
export function JoinForm({ joinCode }: { joinCode?: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [mode, setMode] = useState<Mode>("create");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Same account can be both an admin and a participant -- rather than
  // asking which kind of account this is, detect it after auth and route
  // accordingly, same as the admin login page's own is_admin() check.
  async function redirectAfterAuth() {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) {
      router.push("/admin");
      return;
    }

    if (joinCode) {
      const { error } = await supabase.rpc("join_session", { p_join_code: joinCode });
      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }
    }

    router.push("/dashboard");
  }

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
      await redirectAfterAuth();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMessage(null);
  }

  async function handleCreate(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setErrorMessage(null);
    setStatus("submitting");

    savePendingProfile({ email, firstName, lastName, joinCode: joinCode ?? "" });

    // Runs server-side (sign up, and the redirect on success) so the auth
    // cookie write and the navigation happen in the same response -- see
    // src/lib/actions/participantAuth.ts's comment for why that matters.
    const result = await signUpParticipant({ email, password, joinCode: joinCode ?? "" });
    setErrorMessage(result.message);
    setStatus("form");
  }

  async function handleSignIn(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setErrorMessage(null);
    setStatus("submitting");

    const result = await signInParticipant({ email, password, joinCode: joinCode ?? "" });
    setErrorMessage(result.message);
    setStatus("form");
  }

  if (status === "checking" || status === "already-signed-in") {
    return <p className="text-sm text-(--color-ink-muted)">One moment...</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-[#8a3324]">{errorMessage}</p>;
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-(--color-hairline) p-1">
        <button
          type="button"
          onClick={() => switchMode("create")}
          className={`rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "create"
              ? "bg-(--color-accent) text-(--color-paper)"
              : "text-(--color-ink-muted) hover:text-(--color-ink)"
          }`}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-(--color-accent) text-(--color-paper)"
              : "text-(--color-ink-muted) hover:text-(--color-ink)"
          }`}
        >
          Sign in
        </button>
      </div>

      <form onSubmit={mode === "create" ? handleCreate : handleSignIn} className="space-y-4">
      {mode === "create" ? (
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
      ) : null}

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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <Button type="submit" disabled={status === "submitting"} className="w-full">
        {status === "submitting" ? "One moment..." : mode === "create" ? "Create account" : "Sign in"}
      </Button>
      </form>
    </div>
  );
}
