"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReflection } from "@/lib/actions/reflections";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { WhiteWhaleConfig } from "@/lib/data/operatingAltitude";

/** White Whale as its own module: same content, autosave and rules as when it
 * lived inside Operating Altitude, but with its own completion state -- it
 * needs neither the diagnostic nor its results. */
export function WhiteWhaleFlow({
  config,
  initialValue,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  config: WhiteWhaleConfig;
  initialValue: string;
  participantSessionId: string;
  moduleId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: string) => {
      setSaveState("saving");
      saveReflection({ participantSessionId, field: "white_whale", value: next }).then((outcome) => {
        setSaveState(outcome.ok ? "saved" : "error");
      });
    },
    [participantSessionId],
  );

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(next), 800);
  }

  useEffect(() => {
    const timer = debounceRef.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  function handleContinue() {
    startTransition(async () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Make sure the latest text is saved before the module is marked done.
      const saved = await saveReflection({ participantSessionId, field: "white_whale", value });
      if (!saved.ok) {
        setSaveState("error");
        return;
      }
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "white_whale", sessionPath });
      router.push(sessionPath);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-xl">{config.header}</h2>
        <p className="mt-3 text-sm text-(--color-ink-muted)">{config.setupCopy}</p>
        <p className="mt-4 text-sm text-(--color-ink)">{config.prompt}</p>
        <textarea
          rows={4}
          value={value}
          placeholder={config.placeholderText}
          onChange={(e) => handleChange(e.target.value)}
          className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
        {saveState !== "idle" ? (
          <p className="mt-1 text-xs text-(--color-ink-muted)">
            {saveState === "saving" ? "Saving..." : saveState === "error" ? "Couldn't save -- check your connection" : "Saved"}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-(--color-ink-muted)">{config.privacyNote}</p>
      </Card>
      <Button onClick={handleContinue} disabled={value.trim().length === 0 || isPending || alreadyComplete}>
        {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
      </Button>
    </div>
  );
}
