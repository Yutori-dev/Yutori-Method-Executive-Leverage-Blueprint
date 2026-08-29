"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockWhiteWhale } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function UnlockWhiteWhaleControl({ sessionId, alreadyUnlocked }: { sessionId: string; alreadyUnlocked: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (alreadyUnlocked) {
    return <p className="text-sm text-(--color-ink-muted)">White Whale has been unlocked for this cohort.</p>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#8a3324] bg-[#8a3324]/10 px-4 py-3">
        <p className="text-sm text-(--color-ink)">Unlock the White Whale activity for this cohort?</p>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              startTransition(async () => {
                await unlockWhiteWhale(sessionId);
                setConfirming(false);
                router.refresh();
              })
            }
            disabled={isPending}
          >
            {isPending ? "Unlocking..." : "Yes, unlock for cohort"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="danger" onClick={() => setConfirming(true)}>
      Unlock White Whale
    </Button>
  );
}
