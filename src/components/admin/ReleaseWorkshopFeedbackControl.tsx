"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { releaseWorkshopFeedback } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function ReleaseWorkshopFeedbackControl({
  sessionId,
  alreadyReleased,
}: {
  sessionId: string;
  alreadyReleased: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (alreadyReleased) {
    return (
      <p className="text-sm text-(--color-ink-muted)">
        Workshop feedback has been released to this cohort.
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#8a3324] bg-[#8a3324]/10 px-4 py-3">
        <p className="text-sm text-(--color-ink)">
          Release the final workshop feedback step now? Every currently-live, eligible participant
          will be taken there immediately. This cannot be undone for this session.
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              startTransition(async () => {
                await releaseWorkshopFeedback(sessionId);
                setConfirming(false);
                router.refresh();
              })
            }
            disabled={isPending}
          >
            {isPending ? "Releasing..." : "Yes, release to cohort"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="danger" onClick={() => setConfirming(true)}>
      Release Workshop Feedback
    </Button>
  );
}
