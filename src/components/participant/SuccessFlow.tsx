"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReflection } from "@/lib/actions/reflections";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { SuccessVisionData } from "@/lib/data/successVision";

/** Brief section 11 gives this copy as final (no "INSERT FINAL COPY"
 * marker, unlike White Whale's prompt) -- used verbatim, not as a
 * placeholder. */
export function SuccessFlow({
  data,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  data: SuccessVisionData;
  participantSessionId: string;
  moduleId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [successVision, setSuccessVision] = useState(data.successVision);
  const [followup, setFollowup] = useState(data.whiteWhaleFollowup);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [isPending, startTransition] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const persist = useCallback(
    (field: "success_vision" | "success_vision_white_whale_followup", value: string) => {
      setSaveState("saving");
      saveReflection({ participantSessionId, field, value }).then(() => setSaveState("saved"));
    },
    [participantSessionId],
  );

  function handleChange(
    field: "success_vision" | "success_vision_white_whale_followup",
    value: string,
    setter: (v: string) => void,
  ) {
    setter(value);
    if (timers.current[field]) clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => persist(field, value), 800);
  }

  useEffect(() => {
    const current = timers.current;
    return () => {
      for (const t of Object.values(current)) clearTimeout(t);
    };
  }, []);

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "success", sessionPath });
      router.push(sessionPath);
    });
  }

  const canComplete = successVision.trim().length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-(--color-ink)">
          If this architecture created the space — the Yutori — it is designed to unlock, what
          would become possible in your leadership, your business and your life?
        </p>
        <textarea
          rows={4}
          value={successVision}
          onChange={(e) => handleChange("success_vision", e.target.value, setSuccessVision)}
          className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </Card>

      {data.whiteWhale ? (
        <Card>
          <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
            Your White Whale
          </p>
          <p className="mt-1 text-sm text-(--color-ink)">{data.whiteWhale}</p>
          <p className="mt-4 text-(--color-ink)">
            What becomes possible for the White Whale you identified at the beginning?
          </p>
          <textarea
            rows={3}
            value={followup}
            onChange={(e) =>
              handleChange("success_vision_white_whale_followup", e.target.value, setFollowup)
            }
            className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </Card>
      ) : null}

      <div className="flex items-center gap-4">
        <Button onClick={handleMarkComplete} disabled={!canComplete || isPending || alreadyComplete}>
          {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
        </Button>
        {saveState !== "idle" ? (
          <span className="text-xs text-(--color-ink-muted)">
            {saveState === "saving" ? "Saving..." : "Saved"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
