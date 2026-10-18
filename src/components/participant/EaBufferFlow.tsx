"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEaBufferAnswers, submitEaBuffer } from "@/lib/actions/eaBuffer";
import {
  missingEaBufferFields,
  scoreEaBuffer,
  type EaBufferAnswers,
  type EaBufferConfig,
  type EaBufferDerived,
} from "@/lib/eaBufferSchema";
import { EaBufferResults } from "./EaBufferResults";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * EA Buffer Assessment capture (spec sections 2-6): introduction, the two
 * context questions (with the no-EA exit), the ownership-scale introduction,
 * then one Buffer Function per screen with its four responsibilities
 * together. A progress indicator runs throughout, answers can be revised by
 * going back, and every question is required before submitting. Scores and
 * classifications are never shown while answering; the snapshot appears
 * straight after submitting.
 */
export function EaBufferFlow({
  assessmentId,
  versionId,
  moduleId,
  moduleKey,
  config,
  initialAnswers,
  alreadyComplete,
  participantSessionId,
  sessionPath,
  resultsView,
}: {
  assessmentId: string;
  versionId: string;
  moduleId: string;
  moduleKey: string;
  config: EaBufferConfig;
  initialAnswers: EaBufferAnswers;
  alreadyComplete: boolean;
  participantSessionId: string;
  sessionPath: string;
  resultsView?: React.ReactNode;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<EaBufferAnswers>({
    context: initialAnswers?.context ?? {},
    ownership: initialAnswers?.ownership ?? {},
    noCurrentEa: initialAnswers?.noCurrentEa,
  });
  // Stages: 0 intro, 1 context, 2 scale intro, 3.. one per function.
  const functionStages = config.functions.length;
  const lastStage = 2 + functionStages;
  const [stage, setStage] = useState<number>(() => {
    const a = initialAnswers ?? ({ context: {}, ownership: {} } as EaBufferAnswers);
    const hasAny = Object.keys(a.context ?? {}).length > 0 || Object.keys(a.ownership ?? {}).length > 0;
    if (!hasAny) return 0;
    const contextDone = config.contextQuestions.every((q) => a.context?.[q.id]);
    if (!contextDone) return 1;
    const firstOpen = config.functions.findIndex((fn) => fn.responsibilities.some((r) => typeof a.ownership?.[r.id] !== "number"));
    return firstOpen === -1 ? lastStage : 3 + firstOpen;
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [result, setResult] = useState<EaBufferDerived | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: EaBufferAnswers) => {
      setSaveState("saving");
      saveEaBufferAnswers({ participantSessionId, assessmentId, versionId, answers: next }).then((r) =>
        setSaveState(r.ok ? "saved" : "idle"),
      );
    },
    [participantSessionId, assessmentId, versionId],
  );

  function update(next: EaBufferAnswers) {
    setAnswers(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 500);
  }

  function setContext(questionId: string, value: string) {
    const exit = config.contextQuestions.some((q) => q.id === questionId && q.exitOnValue === value);
    const wasExitQuestion = config.contextQuestions.some((q) => q.id === questionId && q.exitOnValue);
    update({
      ...answers,
      context: { ...answers.context, [questionId]: value },
      noCurrentEa: exit ? true : wasExitQuestion ? false : answers.noCurrentEa,
    });
  }

  function setOwnership(responsibilityId: string, value: number) {
    update({ ...answers, ownership: { ...answers.ownership, [responsibilityId]: value } });
  }

  const missing = missingEaBufferFields(config, answers);

  function submit() {
    setError(null);
    if (missing.length > 0) {
      setShowMissing(true);
      setError("A few required questions are still blank -- they're marked below.");
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    startTransition(async () => {
      const outcome = await submitEaBuffer({
        participantSessionId,
        assessmentId,
        versionId,
        moduleId,
        moduleKey,
        sessionPath,
        answers,
      });
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      setResult(scoreEaBuffer(config, answers));
      router.refresh();
    });
  }

  function goNext() {
    setError(null);
    if (stage === 1) {
      if (config.contextQuestions.some((q) => !answers.context[q.id])) {
        setShowMissing(true);
        setError("Answer both questions to continue.");
        return;
      }
    }
    if (stage >= 3) {
      const fn = config.functions[stage - 3];
      if (fn.responsibilities.some((r) => typeof answers.ownership[r.id] !== "number")) {
        setShowMissing(true);
        setError("Answer all four questions on this screen to continue.");
        return;
      }
    }
    setShowMissing(false);
    if (stage < lastStage) setStage(stage + 1);
    else submit();
  }

  function goBack() {
    setError(null);
    setShowMissing(false);
    setStage(Math.max(0, stage - 1));
  }

  if (result) {
    return (
      <div className="space-y-6">
        <EaBufferResults config={config} derived={result} />
        <Button onClick={() => router.push(sessionPath)}>Continue</Button>
      </div>
    );
  }
  if (alreadyComplete && resultsView) return <>{resultsView}</>;

  // "I do not currently have an EA" ends the assessment.
  if (answers.noCurrentEa) {
    return (
      <Card>
        <p className="text-sm text-(--color-ink)">{config.exitMessage}</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => update({ ...answers, noCurrentEa: false, context: { ...answers.context, [config.contextQuestions[0].id]: "" } })}
            className="text-sm text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            Back
          </button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : "Continue"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-[#8a3324]">{error}</p> : null}
      </Card>
    );
  }

  const activeFunction = stage >= 3 ? config.functions[stage - 3] : null;
  const totalSteps = lastStage; // intro isn't counted
  const progress = stage === 0 ? 0 : Math.round((stage / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {stage > 0 ? (
        <div>
          <div className="flex items-center justify-between text-xs text-(--color-ink-muted)">
            <span>
              Step {stage} of {totalSteps}
            </span>
            <span>{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : ""}</span>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-(--color-accent-soft)"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Assessment progress"
          >
            <div className="h-full rounded-full bg-(--color-accent)" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {stage === 0 ? (
        <Card>
          <h2 className="font-serif text-xl">{config.intro.title}</h2>
          <div className="mt-3 space-y-3 text-sm text-(--color-ink-muted)">
            {config.intro.body.map((p, i) => (
              <p key={i} className={i === 0 ? "text-(--color-ink)" : ""}>
                {p}
              </p>
            ))}
          </div>
          <div className="mt-5">
            <Button onClick={() => setStage(1)}>{config.intro.cta}</Button>
          </div>
        </Card>
      ) : null}

      {stage === 1
        ? config.contextQuestions.map((q) => {
            const isMissing = showMissing && !answers.context[q.id];
            return (
              <Card key={q.id} className={isMissing ? "border-[#8a3324]" : ""}>
                <p className="text-sm font-medium text-(--color-ink)">{q.prompt}</p>
                <div className="mt-3 space-y-1.5">
                  {q.options.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers.context[q.id] === opt.value}
                        onChange={() => setContext(q.id, opt.value)}
                        className="mt-1"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            );
          })
        : null}

      {stage === 2 ? (
        <Card>
          <div className="space-y-3 text-sm text-(--color-ink-muted)">
            {config.scale.body.map((p, i) => (
              <p key={i} className={i === 0 ? "text-(--color-ink)" : ""}>
                {p}
              </p>
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {config.ownershipLevels.map((level) => (
              <li key={level.value} className="rounded-lg border border-(--color-hairline) px-4 py-2.5 text-sm">
                <span className="font-medium text-(--color-ink)">{level.label}</span>
                <span className="mt-0.5 block text-(--color-ink-muted)">{level.description}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {activeFunction ? (
        <>
                <Card>
                  <h2 className="font-serif text-xl">{activeFunction.name}</h2>
                  <p className="mt-2 text-sm text-(--color-ink-muted)">{activeFunction.description}</p>
                </Card>
                {activeFunction.responsibilities.map((r) => {
                  const isMissing = showMissing && typeof answers.ownership[r.id] !== "number";
                  return (
                    <Card key={r.id} className={isMissing ? "border-[#8a3324]" : ""}>
                      <h3 className="text-sm font-medium text-(--color-ink)">{r.name}</h3>
                      <p className="mt-1 text-xs text-(--color-ink-muted)">{r.description}</p>
                      <p className="mt-4 text-sm text-(--color-ink)">{config.questionPrompt}</p>
                      <div className="mt-2 space-y-1.5">
                        {config.ownershipLevels.map((level) => (
                          <label key={level.value} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
                            <input
                              type="radio"
                              name={`${r.id}-ownership`}
                              checked={answers.ownership[r.id] === level.value}
                              onChange={() => setOwnership(r.id, level.value)}
                              className="mt-1"
                            />
                            <span>
                              <span className="font-medium">{level.label}.</span> {level.description}
                            </span>
                          </label>
                        ))}
                      </div>
                    </Card>
                  );
                })}
        </>
      ) : null}

      {stage >= 1 ? (
        <div>
          {error ? <p className="mb-3 text-sm text-[#8a3324]">{error}</p> : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Back
            </button>
            <Button onClick={goNext} disabled={isPending}>
              {isPending ? "Submitting..." : stage === lastStage ? "Submit assessment" : stage === 2 ? config.scale.cta : "Continue"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
