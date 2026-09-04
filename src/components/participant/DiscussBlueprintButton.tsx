"use client";

import { useState, useTransition } from "react";
import { requestFollowUp } from "@/lib/actions/followUp";
import { Button } from "@/components/ui/Button";

/** Brief section 15: "a quiet final CTA." Originally Blueprint-page-only;
 * client feedback 2026-09-03 asked for the same control on the dashboard
 * too, once the Blueprint is revealed there -- same follow-up-interest
 * queue either way, so this one component is reused rather than duplicated. */
export function DiscussBlueprintButton({
  participantSessionId,
  alreadyRequested,
}: {
  participantSessionId: string;
  alreadyRequested: boolean;
}) {
  const [requested, setRequested] = useState(alreadyRequested);
  const [isPending, startTransition] = useTransition();

  if (requested) {
    return (
      <p className="text-sm text-(--color-ink-muted)">
        Thanks — a member of the Yutori Method team will reach out to schedule a conversation.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-(--color-ink-muted)">
        Interested in exploring your Blueprint further? A member of the Yutori Method team will
        reach out to schedule a conversation.
      </p>
      <div className="mt-3">
        <Button
          variant="info"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await requestFollowUp(participantSessionId);
              if (result.ok) setRequested(true);
            })
          }
        >
          {isPending ? "Sending..." : "Contact me about my results"}
        </Button>
      </div>
    </div>
  );
}
