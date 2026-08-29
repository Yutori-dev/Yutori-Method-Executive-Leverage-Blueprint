"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockNextModule } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function UnlockModuleControl({
  sessionId,
  nextModuleName,
}: {
  sessionId: string;
  nextModuleName: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!nextModuleName) {
    return <p className="text-sm text-(--color-ink-muted)">All modules are unlocked.</p>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-(--color-accent) bg-(--color-accent-soft) px-4 py-3">
        <p className="text-sm text-(--color-ink)">
          Unlock <strong>{nextModuleName}</strong> for every participant in this session?
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              startTransition(async () => {
                await unlockNextModule(sessionId);
                setConfirming(false);
                router.refresh();
              })
            }
            disabled={isPending}
          >
            {isPending ? "Unlocking..." : "Yes, unlock"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={() => setConfirming(true)}>Unlock next module: {nextModuleName}</Button>
  );
}
