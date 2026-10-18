"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSelfIdentification } from "@/lib/actions/reflections";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { LeadershipWiringConfig } from "@/lib/data/operatingAltitude";
import type { SelfIdentification } from "@/types/database";

const OPTIONS: SelfIdentification[] = ["visionary", "integrator", "hybrid"];

/** Leadership Wiring as its own module: same question, options and rules as
 * when it was the last step of Operating Altitude, with its own completion
 * state. */
export function LeadershipWiringFlow({
  config,
  initialSelection,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  config: LeadershipWiringConfig;
  initialSelection: SelfIdentification | null;
  participantSessionId: string;
  moduleId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [selfId, setSelfId] = useState<SelfIdentification | null>(initialSelection);
  const [isPending, startTransition] = useTransition();

  function handleSelect(value: SelfIdentification) {
    setSelfId(value);
    startTransition(async () => {
      await setSelfIdentification({ participantSessionId, value, sessionPath });
    });
  }

  function handleContinue() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "leadership_wiring", sessionPath });
      router.push(sessionPath);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-xl">{config.header}</h2>
        <p className="mt-3 text-sm text-(--color-ink)">{config.prompt}</p>
        <div className="mt-4 space-y-2">
          {OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSelect(value)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                selfId === value
                  ? "border-(--color-accent) bg-(--color-accent-soft)"
                  : "border-(--color-hairline) hover:border-(--color-accent)",
              )}
            >
              <span className="font-medium capitalize text-(--color-ink)">{value}</span>
              <span className="mt-1 block text-(--color-ink-muted)">{config.descriptions[value]}</span>
            </button>
          ))}
        </div>
      </Card>
      <Button onClick={handleContinue} disabled={selfId === null || isPending || alreadyComplete}>
        {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
      </Button>
    </div>
  );
}
