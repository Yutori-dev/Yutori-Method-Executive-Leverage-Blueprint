"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revealZoneOfInvestment } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function RevealZoneOfInvestmentControl({
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
    return (
      <p className="text-sm text-(--color-ink-muted)">
        Zone of Investment has been revealed to this cohort.
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#8a3324] bg-[#8a3324]/10 px-4 py-3">
        <p className="text-sm text-(--color-ink)">
          Reveal each participant&apos;s personalized Zone of Investment map now? This cannot be
          undone for this session.
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              startTransition(async () => {
                await revealZoneOfInvestment(sessionId);
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

  return (
    <Button variant="danger" onClick={() => setConfirming(true)}>
      Reveal Zone of Investment to Cohort
    </Button>
  );
}
