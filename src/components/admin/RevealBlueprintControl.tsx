"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revealBlueprint } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function RevealBlueprintControl({
  sessionId,
  alreadyRevealed,
}: {
  sessionId: string;
  alreadyRevealed: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (alreadyRevealed) {
    return <p className="text-sm text-(--color-ink-muted)">The Blueprint has been revealed to this cohort.</p>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-(--color-hairline) bg-(--color-accent-soft) px-4 py-3">
        <p className="text-sm text-(--color-ink)">
          Reveal the Blueprint now? Every eligible participant will see the &quot;View my Blueprint&quot;
          link on their dashboard.
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              startTransition(async () => {
                await revealBlueprint(sessionId);
                setConfirming(false);
                router.refresh();
              })
            }
            disabled={isPending}
          >
            {isPending ? "Revealing..." : "Yes, reveal to cohort"}
          </Button>
        </div>
      </div>
    );
  }

  return <Button onClick={() => setConfirming(true)}>Generate Blueprint Reveal</Button>;
}
