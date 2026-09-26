"use client";

import { useState, useTransition } from "react";
import { mergeParticipantByEmail } from "@/lib/actions/masterProfile";
import { Button } from "@/components/ui/Button";

/** Links a different-email registration to this profile -- the "if
 * someone registers with a different email address, an admin needs to
 * be able to link the new registration to their existing profile" ask.
 * Danger-zone-style confirm since this immediately grants the merged
 * account read access to this profile's full history. */
export function MergeParticipantControl({ masterProfileId }: { masterProfileId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Link another registration
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-(--color-hairline) bg-(--color-accent-soft) p-4">
      <p className="text-sm text-(--color-ink)">
        Enter the email of the other registration. Once linked, both accounts see the same
        combined history -- sessions, responses, and artifacts from either.
      </p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="other-email@example.com"
        className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
      />
      {errorMessage ? <p className="mt-2 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-2 text-sm text-(--color-success)">{successMessage}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            setConfirming(false);
            setEmail("");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          disabled={!email.trim() || isPending}
          onClick={() =>
            startTransition(async () => {
              setErrorMessage(null);
              const result = await mergeParticipantByEmail({ targetMasterProfileId: masterProfileId, sourceEmail: email });
              if (!result.ok) {
                setErrorMessage(result.message);
                return;
              }
              setSuccessMessage(`Linked ${result.mergedName}.`);
              setEmail("");
            })
          }
        >
          {isPending ? "Linking..." : "Link registration"}
        </Button>
      </div>
    </div>
  );
}
