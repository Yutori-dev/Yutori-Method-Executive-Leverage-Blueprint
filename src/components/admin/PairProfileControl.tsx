"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pairMasterProfilesByEmail, unpairMasterProfile } from "@/lib/actions/masterProfile";
import { Button } from "@/components/ui/Button";

/** Manual Visionary<->Integrator pairing (client brief item 3, last
 * bullet) -- future modules needing both people's input on one artifact
 * (e.g. an EA leverage assessment) read this pairing to know who to
 * combine. */
export function PairProfileControl({
  masterProfileId,
  paired,
}: {
  masterProfileId: string;
  paired: { firstName: string; lastName: string } | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (paired && !editing) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-(--color-ink)">
          Paired with <span className="text-(--color-accent)">{paired.firstName} {paired.lastName}</span>
        </p>
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await unpairMasterProfile(masterProfileId);
              router.refresh();
            })
          }
        >
          {isPending ? "Removing..." : "Remove pairing"}
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <Button variant="ghost" onClick={() => setEditing(true)}>
        Pair with counterpart
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-(--color-hairline) bg-(--color-accent-soft) p-4">
      <p className="text-sm text-(--color-ink)">
        Enter the counterpart&apos;s email (e.g. the Integrator for this Visionary, or vice versa).
      </p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="counterpart@example.com"
        className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
      />
      {errorMessage ? <p className="mt-2 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setEmail("");
            setErrorMessage(null);
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
              const result = await pairMasterProfilesByEmail({ masterProfileId, counterpartEmail: email });
              if (!result.ok) {
                setErrorMessage(result.message);
                return;
              }
              setEditing(false);
              setEmail("");
              router.refresh();
            })
          }
        >
          {isPending ? "Pairing..." : "Pair"}
        </Button>
      </div>
    </div>
  );
}
