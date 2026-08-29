"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveResponse, markModuleComplete } from "@/lib/actions/participant";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import type { Json } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AssessmentForm({
  assessment,
  participantSessionId,
  moduleId,
  moduleKey,
  sessionPath,
  alreadyComplete,
  isPlaceholder,
  hideCompleteButton = false,
  onRequiredAnsweredChange,
}: {
  assessment: DemoAssessment;
  participantSessionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
  alreadyComplete: boolean;
  /** Real, approved content (e.g. the Executive Leverage Diagnostic) must
   * never show the "Development placeholder" badge -- only dev-only demo
   * assessments (fetched via getDemoAssessmentByKey) should. */
  isPlaceholder: boolean;
  /** When embedded inside a larger multi-part module flow (e.g. Delegation
   * in Milestone 2), the parent owns the "mark module complete" action and
   * just wants to know when required questions are answered. */
  hideCompleteButton?: boolean;
  onRequiredAnsweredChange?: (allAnswered: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, Json>>(() =>
    Object.fromEntries(assessment.questions.map((q) => [q.id, q.existingAnswer as Json])),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isCompleting, startCompleting] = useTransition();
  const router = useRouter();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const persist = useCallback(
    async (questionId: string, answer: Json) => {
      setSaveState("saving");
      const result = await saveResponse({ participantSessionId, questionId, answer });
      setSaveState(result.ok ? "saved" : "error");
    },
    [participantSessionId],
  );

  const setAnswer = useCallback(
    (questionId: string, answer: Json, debounceMs: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));

      if (debounceTimers.current[questionId]) {
        clearTimeout(debounceTimers.current[questionId]);
      }
      debounceTimers.current[questionId] = setTimeout(() => {
        void persist(questionId, answer);
      }, debounceMs);
    },
    [persist],
  );

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const timer of Object.values(timers)) clearTimeout(timer);
    };
  }, []);

  function isAnswered(value: Json) {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  const requiredComplete = assessment.questions
    .filter((q) => q.required)
    .every((q) => isAnswered(answers[q.id] ?? null));

  useEffect(() => {
    onRequiredAnsweredChange?.(requiredComplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredComplete]);

  function handleComplete() {
    startCompleting(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey, sessionPath });
      router.push(sessionPath);
    });
  }

  return (
    <div className="space-y-6">
      {isPlaceholder ? (
        <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
          Development placeholder — {assessment.assessmentName}
        </p>
      ) : null}

      {assessment.questions.map((question) => (
        <Card key={question.id}>
          <p className="text-(--color-ink)">{question.prompt}</p>

          <div className="mt-4">
            {question.type === "multiple_choice" && (
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                      answers[question.id] === option.value
                        ? "border-(--color-accent) bg-(--color-accent-soft)"
                        : "border-(--color-hairline) hover:border-(--color-accent)",
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={answers[question.id] === option.value}
                      onChange={() => setAnswer(question.id, option.value, 300)}
                      className="accent-(--color-accent)"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}

            {question.type === "multi_select" && (
              <div className="space-y-2">
                {question.options.map((option) => {
                  const selected = Array.isArray(answers[question.id])
                    ? (answers[question.id] as unknown as string[])
                    : [];
                  const checked = selected.includes(option.value);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                        checked
                          ? "border-(--color-accent) bg-(--color-accent-soft)"
                          : "border-(--color-hairline) hover:border-(--color-accent)",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selected.filter((v) => v !== option.value)
                            : [...selected, option.value];
                          setAnswer(question.id, next as unknown as Json, 300);
                        }}
                        className="accent-(--color-accent)"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            )}

            {question.type === "numeric" && (
              <input
                type="number"
                min={typeof question.config.min === "number" ? question.config.min : undefined}
                max={typeof question.config.max === "number" ? question.config.max : undefined}
                step={typeof question.config.step === "number" ? question.config.step : undefined}
                placeholder={
                  typeof question.config.placeholder === "string" ? question.config.placeholder : undefined
                }
                value={typeof answers[question.id] === "number" ? (answers[question.id] as number) : ""}
                onChange={(e) => setAnswer(question.id, e.target.value === "" ? null : Number(e.target.value), 300)}
                className="w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
            )}

            {question.type === "rating_scale" && (
              <RatingScale
                min={Number(question.config.min ?? 1)}
                max={Number(question.config.max ?? 5)}
                minLabel={typeof question.config.min_label === "string" ? question.config.min_label : undefined}
                maxLabel={typeof question.config.max_label === "string" ? question.config.max_label : undefined}
                value={typeof answers[question.id] === "number" ? (answers[question.id] as number) : null}
                onChange={(value) => setAnswer(question.id, value, 300)}
              />
            )}

            {question.type === "free_text" && (
              <textarea
                rows={3}
                placeholder={
                  typeof question.config.placeholder === "string" ? question.config.placeholder : undefined
                }
                value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                onChange={(e) => setAnswer(question.id, e.target.value, 800)}
                className="w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
            )}
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-4">
        {!hideCompleteButton ? (
          <Button onClick={handleComplete} disabled={!requiredComplete || isCompleting || alreadyComplete}>
            {alreadyComplete ? "Module complete" : isCompleting ? "Saving..." : "CONTINUE"}
          </Button>
        ) : null}
        <SaveIndicator state={saveState} />
      </div>
    </div>
  );
}

function RatingScale({
  min,
  max,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <div className="flex gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors",
              value === v
                ? "border-(--color-accent) bg-(--color-accent) text-(--color-paper)"
                : "border-(--color-hairline) hover:border-(--color-accent)",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-2 flex justify-between text-xs text-(--color-ink-muted)">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const label = { saving: "Saving...", saved: "Saved", error: "Couldn't save — check your connection" }[state];
  return (
    <span className={cn("text-xs", state === "error" ? "text-[#8a3324]" : "text-(--color-ink-muted)")}>
      {label}
    </span>
  );
}
