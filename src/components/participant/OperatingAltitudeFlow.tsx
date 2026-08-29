"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExecutiveLeverageDiagnosticFlow } from "./ExecutiveLeverageDiagnosticFlow";
import { CharacterPreview } from "./CharacterPreview";
import { setSelfIdentification, saveReflection } from "@/lib/actions/reflections";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import type { OperatingAltitudeData } from "@/lib/data/operatingAltitude";
import type { ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";
import type { SelfIdentification } from "@/types/database";

const OPTIONS: { value: SelfIdentification; label: string }[] = [
  { value: "visionary", label: "Visionary" },
  { value: "integrator", label: "Integrator" },
  { value: "hybrid", label: "Hybrid" },
];

export function OperatingAltitudeFlow({
  diagnosticAssessment,
  diagnosticResult,
  data,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  diagnosticAssessment: DemoAssessment | null;
  diagnosticResult: ExecutiveLeverageProfileResult | null;
  data: OperatingAltitudeData;
  participantSessionId: string;
  moduleId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ExecutiveLeverageProfileResult | null>(diagnosticResult);
  const [selfId, setSelfId] = useState<SelfIdentification | null>(data.selfIdentification);
  const [whiteWhale, setWhiteWhale] = useState(data.whiteWhale);
  const [whiteWhaleSaveState, setWhiteWhaleSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistWhiteWhale = useCallback(
    (value: string) => {
      setWhiteWhaleSaveState("saving");
      saveReflection({ participantSessionId, field: "white_whale", value }).then(() => {
        setWhiteWhaleSaveState("saved");
      });
    },
    [participantSessionId],
  );

  function handleWhiteWhaleChange(value: string) {
    setWhiteWhale(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persistWhiteWhale(value), 800);
  }

  useEffect(() => {
    const timer = debounceRef.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  function handleSelfId(value: SelfIdentification) {
    setSelfId(value);
    startTransition(async () => {
      await setSelfIdentification({ participantSessionId, value, sessionPath });
    });
  }

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({
        participantSessionId,
        moduleId,
        moduleKey: "operating_altitude",
        sessionPath,
      });
      router.push(sessionPath);
    });
  }

  const canComplete = result !== null && selfId !== null;

  return (
    <div className="space-y-8">
      <ExecutiveLeverageDiagnosticFlow
        assessment={diagnosticAssessment}
        result={result}
        participantSessionId={participantSessionId}
        moduleId={moduleId}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
        onResultChange={setResult}
      />

      <section>
        <h2 className="font-serif text-xl">An important project left unrealized</h2>
        <Card className="mt-4">
          <p className="text-sm text-(--color-ink-muted)">
            Identify an important project, initiative, opportunity or ambition that has remained
            unrealized because competing demands continually take priority. This stays private to
            you and your facilitator.
          </p>
          <textarea
            rows={3}
            value={whiteWhale}
            onChange={(e) => handleWhiteWhaleChange(e.target.value)}
            className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
          {whiteWhaleSaveState !== "idle" ? (
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              {whiteWhaleSaveState === "saving" ? "Saving..." : "Saved"}
            </p>
          ) : null}
        </Card>
      </section>

      <section>
        <h2 className="font-serif text-xl">How would you describe yourself?</h2>
        <div className="mt-4 flex gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleSelfId(o.value)}
              className={cn(
                "flex-1 rounded-lg border px-4 py-3 text-sm transition-colors",
                selfId === o.value
                  ? "border-(--color-accent) bg-(--color-accent-soft)"
                  : "border-(--color-hairline) hover:border-(--color-accent)",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {selfId ? (
          <div className="mt-6">
            <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
              Character — unlocked in the live workshop
            </p>
            <div className="mt-3">
              <CharacterPreview />
            </div>
          </div>
        ) : null}
      </section>

      <Button onClick={handleMarkComplete} disabled={!canComplete || isPending || alreadyComplete}>
        {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
      </Button>
    </div>
  );
}
