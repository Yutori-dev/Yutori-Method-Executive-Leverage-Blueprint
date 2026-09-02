"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveExecutiveSupportAuditResponse,
  calculateExecutiveSupportAuditResults,
} from "@/lib/actions/executiveSupportAudit";
import { markModuleComplete } from "@/lib/actions/participant";
import type { ExecutiveSupportAuditData } from "@/lib/data/executiveSupportAudit";
import type { PriorityLeverageRevealData } from "@/lib/data/priorityLeverageReveal";
import { PriorityLeverageReveal } from "@/components/participant/PriorityLeverageReveal";
import { SessionGateWatcher } from "@/components/participant/SessionGateWatcher";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { LeverageLevel } from "@/types/database";

const LEVEL_LABEL: Record<LeverageLevel, string> = {
  execution: "Execution Leverage",
  orchestration: "Orchestration Leverage",
  strategic: "Strategic Leverage",
  systems: "Systems Leverage",
};

export function ExecutiveSupportAuditFlow({
  data,
  priorityLeverageData,
  participantSessionId,
  moduleId,
  sessionId,
  sessionPath,
  alreadyComplete,
}: {
  data: ExecutiveSupportAuditData;
  priorityLeverageData: PriorityLeverageRevealData | null;
  participantSessionId: string;
  moduleId: string;
  sessionId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [started, setStarted] = useState(Object.keys(data.responses).length > 0 || !!data.result);
  const [answers, setAnswers] = useState<Record<string, LeverageLevel>>(data.responses);
  const [index, setIndex] = useState(() => {
    const firstUnanswered = data.questions.findIndex((q) => !(q.id in data.responses));
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "leverage", sessionPath });
      router.push(sessionPath);
    });
  }

  if (data.result) {
    return (
      <div className="space-y-6">
        {/* In-place mode (advanceHref omitted) -- if the admin reveals
         * Priority Leverage while the participant is already sitting on
         * this exact results screen, this refreshes it in place instead of
         * requiring them to leave (dashboard) and re-enter the module to
         * see it (client feedback 2026-09). Same pattern already used for
         * the White Whale / Leadership Wiring / Zone of Investment gates. */}
        {priorityLeverageData && !priorityLeverageData.revealed ? (
          <SessionGateWatcher sessionId={sessionId} />
        ) : null}
        <ExecutiveSupportAuditResults data={data} />
        {priorityLeverageData ? <PriorityLeverageReveal data={priorityLeverageData} /> : null}
        <Button onClick={handleMarkComplete} disabled={isPending || alreadyComplete}>
          {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
        </Button>
      </div>
    );
  }

  if (!started) {
    return (
      <Card>
        <h2 className="font-serif text-xl">{data.config.introHeader}</h2>
        <p className="mt-2 text-sm font-medium text-(--color-ink)">{data.config.introSubheader}</p>
        <p className="mt-3 text-sm text-(--color-ink-muted)">{data.config.introBody}</p>
        <Button className="mt-5" onClick={() => setStarted(true)}>
          Begin
        </Button>
      </Card>
    );
  }

  const question = data.questions[index];
  const isLast = index === data.questions.length - 1;

  async function handleSelect(layer: LeverageLevel) {
    setErrorMessage(null);
    setAnswers((prev) => ({ ...prev, [question.id]: layer }));
    setSaving(true);

    const result = await saveExecutiveSupportAuditResponse({
      participantSessionId,
      questionId: question.id,
      selectedLayer: layer,
    });

    if (!result.ok) {
      setSaving(false);
      setErrorMessage(result.message);
      return;
    }

    if (!isLast) {
      setSaving(false);
      setIndex((i) => i + 1);
      return;
    }

    const calcResult = await calculateExecutiveSupportAuditResults({ participantSessionId, sessionPath });
    setSaving(false);
    if (!calcResult.ok) {
      setErrorMessage(calcResult.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <p className="text-xs text-(--color-ink-muted)">
        Question {index + 1} of {data.questions.length}
      </p>
      <p className="mt-2 text-(--color-ink)">{question.prompt}</p>
      <div className="mt-4 space-y-2">
        {question.options.map((option) => (
          <button
            key={option.layer}
            type="button"
            disabled={saving}
            onClick={() => handleSelect(option.layer)}
            className={cn(
              "w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
              answers[question.id] === option.layer
                ? "border-(--color-accent) bg-(--color-accent-soft)"
                : "border-(--color-hairline) hover:border-(--color-accent)",
            )}
          >
            {option.text}
          </button>
        ))}
      </div>
      {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}
    </Card>
  );
}

function ExecutiveSupportAuditResults({ data }: { data: ExecutiveSupportAuditData }) {
  const result = data.result!;
  const isPrimaryTied = result.primaryLayers.length > 1;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-xl">Your Executive Support Audit</h2>
        <p className="mt-2 text-sm text-(--color-ink-muted)">{data.config.resultsIntroCopy}</p>
      </Card>

      <Card>
        <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
          {isPrimaryTied ? "Your most prominent leverage gaps" : "Primary leverage gap"}
        </p>
        <div className="mt-3 space-y-4">
          {result.primaryLayers.map((layer) => (
            <div key={layer}>
              <p className="text-sm text-(--color-ink)">{LEVEL_LABEL[layer]}</p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">{data.config.primaryCopy[layer]}</p>
            </div>
          ))}
        </div>
      </Card>

      {!isPrimaryTied ? (
        <Card>
          <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
            {result.secondaryLayers.length > 1 ? "Secondary leverage gaps" : "Secondary leverage gap"}
          </p>
          {result.secondaryLayers.length > 0 ? (
            <div className="mt-3 space-y-4">
              {result.secondaryLayers.map((layer) => (
                <div key={layer}>
                  <p className="text-sm text-(--color-ink)">{LEVEL_LABEL[layer]}</p>
                  <p className="mt-1 text-sm text-(--color-ink-muted)">{data.config.secondaryCopy[layer]}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-(--color-ink)">{data.config.noSecondaryCopy}</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
