"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearPendingProfile, readPendingProfile } from "@/lib/pendingProfile";
import { Button } from "@/components/ui/Button";

function prefillFromPending(email: string) {
  const pending = readPendingProfile();
  return pending && pending.email === email
    ? { firstName: pending.firstName, lastName: pending.lastName }
    : { firstName: "", lastName: "" };
}

export function CompleteProfileForm({
  email,
  joinCode,
}: {
  email: string;
  joinCode?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [firstName, setFirstName] = useState(() => prefillFromPending(email).firstName);
  const [lastName, setLastName] = useState(() => prefillFromPending(email).lastName);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const { error: profileError } = await supabase.rpc("ensure_participant", {
      p_first_name: firstName,
      p_last_name: lastName,
    });

    if (profileError) {
      setErrorMessage(profileError.message);
      setSubmitting(false);
      return;
    }

    if (joinCode) {
      const { error: joinError } = await supabase.rpc("join_session", {
        p_join_code: joinCode,
      });
      if (joinError) {
        setErrorMessage(joinError.message);
        setSubmitting(false);
        return;
      }
    }

    clearPendingProfile();
    router.push("/dashboard");
    router.refresh();
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

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Continuing..." : "Continue"}
      </Button>
    </form>
  );
}
