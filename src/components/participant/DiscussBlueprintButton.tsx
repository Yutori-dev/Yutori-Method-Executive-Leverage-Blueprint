"use client";

import { useState, useTransition } from "react";
import { requestFollowUp } from "@/lib/actions/followUp";
import { Button } from "@/components/ui/Button";

/** Brief section 15: "a quiet final CTA" -- deliberately not repeated
 * elsewhere in the app. */
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
          variant="ghost"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await requestFollowUp(participantSessionId);
              if (result.ok) setRequested(true);
            })
          }
        >
          {isPending ? "Sending..." : "Discuss My Blueprint"}
        </Button>
      </div>
    </div>
  );
}
