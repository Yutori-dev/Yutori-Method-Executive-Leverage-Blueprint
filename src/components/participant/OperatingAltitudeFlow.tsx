"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExecutiveLeverageDiagnosticFlow } from "./ExecutiveLeverageDiagnosticFlow";
import { CharacterPreview } from "./CharacterPreview";
import { HoldingState } from "./HoldingState";
import { SessionGateWatcher } from "./SessionGateWatcher";
import { setSelfIdentification, saveReflection } from "@/lib/actions/reflections";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import type { OperatingAltitudeData } from "@/lib/data/operatingAltitude";
import type { ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";
import type { SelfIdentification } from "@/types/database";

const OPTIONS: SelfIdentification[] = ["visionary", "integrator", "hybrid"];

type Phase = "diagnostic" | "white_whale" | "leadership_wiring";

export function OperatingAltitudeFlow({
  diagnosticAssessment,
  diagnosticResult,
  data,
  participantSessionId,
  moduleId,
  sessionId,
  sessionPath,
  alreadyComplete,
}: {
  diagnosticAssessment: DemoAssessment | null;
  diagnosticResult: ExecutiveLeverageProfileResult | null;
  data: OperatingAltitudeData;
  participantSessionId: string;
  moduleId: string;
  sessionId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ExecutiveLeverageProfileResult | null>(diagnosticResult);
  const [selfId, setSelfId] = useState<SelfIdentification | null>(data.selfIdentification);
  const [whiteWhale, setWhiteWhale] = useState(data.whiteWhale);
  const [whiteWhaleSaveState, setWhiteWhaleSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>(() => {
    if (!diagnosticResult) return "diagnostic";
    if (!data.whiteWhale.trim()) return "white_whale";
    return "leadership_wiring";
  });

  const persistWhiteWhale = useCallback(
    (value: string) => {
      setWhiteWhaleSaveState("saving");
      saveReflection({ participantSessionId, field: "white_whale", value }).then((outcome) => {
        setWhiteWhaleSaveState(outcome.ok ? "saved" : "error");
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

  if (phase === "diagnostic") {
    return (
      <div className="space-y-6">
        <ExecutiveLeverageDiagnosticFlow
          assessment={diagnosticAssessment}
          result={result}
          participantSessionId={participantSessionId}
          moduleId={moduleId}
          sessionPath={sessionPath}
          alreadyComplete={alreadyComplete}
          onResultChange={(next) => {
            setResult(next);
            if (next) setPhase("white_whale");
          }}
        />
        {/* Revisiting via the White Whale phase's "review" link lands here
         * with a result already set -- ExecutiveLeverageDiagnosticFlow only
         * advances the phase automatically the first time a result is
         * calculated, so a manual way forward is needed on every later visit. */}
        {result ? <Button onClick={() => setPhase("white_whale")}>CONTINUE</Button> : null}
      </div>
    );
  }

  if (phase === "white_whale") {
    if (!data.whiteWhaleUnlocked) {
      return (
        <>
          <SessionGateWatcher sessionId={sessionId} />
          <HoldingState sessionPath={sessionPath} />
        </>
      );
    }

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setPhase("diagnostic")}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Review my Executive Leverage Profile
        </button>
        <Card>
          <h2 className="font-serif text-xl">{data.whiteWhaleConfig.header}</h2>
          <p className="mt-3 text-sm text-(--color-ink-muted)">{data.whiteWhaleConfig.setupCopy}</p>
          <p className="mt-4 text-sm text-(--color-ink)">{data.whiteWhaleConfig.prompt}</p>
          <textarea
            rows={4}
            value={whiteWhale}
            placeholder={data.whiteWhaleConfig.placeholderText}
            onChange={(e) => handleWhiteWhaleChange(e.target.value)}
            className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
          {whiteWhaleSaveState !== "idle" ? (
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              {whiteWhaleSaveState === "saving"
                ? "Saving..."
                : whiteWhaleSaveState === "error"
                  ? "Couldn't save -- check your connection"
                  : "Saved"}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-(--color-ink-muted)">{data.whiteWhaleConfig.privacyNote}</p>
        </Card>
        <Button onClick={() => setPhase("leadership_wiring")} disabled={whiteWhale.trim().length === 0}>
          CONTINUE
        </Button>
      </div>
    );
  }

  if (!data.leadershipWiringUnlocked) {
    return (
      <>
        <SessionGateWatcher sessionId={sessionId} />
        <HoldingState sessionPath={sessionPath} />
      </>
    );
  }

  const canComplete = selfId !== null;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setPhase("white_whale")}
        className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
      >
        ← Review my White Whale
      </button>
      <Card>
        <h2 className="font-serif text-xl">{data.leadershipWiringConfig.header}</h2>
        <p className="mt-3 text-sm text-(--color-ink)">{data.leadershipWiringConfig.prompt}</p>
        <div className="mt-4 space-y-2">
          {OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSelfId(value)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                selfId === value
                  ? "border-(--color-accent) bg-(--color-accent-soft)"
                  : "border-(--color-hairline) hover:border-(--color-accent)",
              )}
            >
              <span className="font-medium capitalize text-(--color-ink)">{value}</span>
              <span className="mt-1 block text-(--color-ink-muted)">
                {data.leadershipWiringConfig.descriptions[value]}
              </span>
            </button>
          ))}
        </div>

        {selfId ? (
          <div className="mt-6">
            <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
              Character — unlocked in the live workshop
            </p>
            <div className="mt-3">
              <CharacterPreview leadershipWiring={selfId} />
            </div>
          </div>
        ) : null}
      </Card>

      <Button onClick={handleMarkComplete} disabled={!canComplete || isPending || alreadyComplete}>
        {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
      </Button>
    </div>
  );
}
