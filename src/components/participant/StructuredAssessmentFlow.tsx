"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveStructuredAssessmentAnswers,
  submitStructuredAssessment,
} from "@/lib/actions/structuredAssessments";
import {
  isQuestionAnswered,
  missingRequiredQuestions,
  type StructuredAssessmentConfig,
} from "@/lib/structuredAssessmentSchema";
import type { Json } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const fieldClass =
  "mt-2 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

/**
 * Generic renderer for any structured_assessments config -- so far only
 * the EA Experience Assessment's question types (short_text, email,
 * single_select, multi_select, matrix). Single scrolling page, not
 * Typeform-style stepping (only High-Leverage Handoff's spec asks for
 * that, not this one).
 */
export function StructuredAssessmentFlow({
  assessmentId,
  versionId,
  moduleId,
  moduleKey,
  config,
  initialAnswers,
  alreadyComplete,
  participantSessionId,
  sessionPath,
}: {
  assessmentId: string;
  versionId: string;
  moduleId: string;
  moduleKey: string;
  config: StructuredAssessmentConfig;
  initialAnswers: Record<string, Json>;
  alreadyComplete: boolean;
  participantSessionId: string;
  sessionPath: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Json>>(initialAnswers);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: Record<string, Json>) => {
      setSaveState("saving");
      saveStructuredAssessmentAnswers({
        participantSessionId,
        assessmentId,
        versionId,
        answers: next,
      }).then((result) => setSaveState(result.ok ? "saved" : "idle"));
    },
    [participantSessionId, assessmentId, versionId],
  );

  function setAnswer(questionId: string, value: Json) {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist({ [questionId]: value }), 600);
  }

  function setMatrixAnswer(questionId: string, rowId: string, value: string) {
    const current = (answers[questionId] as Record<string, Json> | undefined) ?? {};
    const nextRow = { ...current, [rowId]: value };
    setAnswer(questionId, nextRow);
  }

  const missing = missingRequiredQuestions(config, answers);

  function handleSubmit() {
    setError(null);
    if (missing.length > 0) {
      setShowMissing(true);
      setError("A few required questions are still blank -- they're marked below.");
      return;
    }
    startTransition(async () => {
      const result = await submitStructuredAssessment({
        participantSessionId,
        assessmentId,
        versionId,
        moduleId,
        moduleKey,
        sessionPath,
        answers,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(sessionPath);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        {config.intro.title ? <h2 className="font-serif text-lg">{config.intro.title}</h2> : null}
        <div className="space-y-3 text-sm text-(--color-ink-muted)">
          {config.intro.body.map((p, i) => (
            <p key={i} className={i === 0 ? "text-(--color-ink)" : ""}>
              {p}
            </p>
          ))}
        </div>
      </Card>

      {alreadyComplete ? (
        <Card>
          <p className="text-sm text-(--color-ink)">{config.completion_message}</p>
        </Card>
      ) : (
        <>
          {config.questions.map((q) => {
            const unanswered = showMissing && q.required && !isQuestionAnswered(q, answers);
            return (
              <Card key={q.id} className={unanswered ? "border-[#8a3324]" : ""}>
                <label className="block text-sm text-(--color-ink)">
                  {q.prompt}
                  {q.required ? null : <span className="ml-1 text-xs text-(--color-ink-muted)">(optional)</span>}
                </label>
                {q.instruction ? <p className="mt-1 text-xs text-(--color-ink-muted)">{q.instruction}</p> : null}

                {q.type === "short_text" || q.type === "email" ? (
                  <input
                    type={q.type === "email" ? "email" : "text"}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    className={fieldClass}
                  />
                ) : null}

                {q.type === "single_select" ? (
                  <div className="mt-2 space-y-1.5">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswer(q.id, opt)}
                          className="mt-1"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                {q.type === "multi_select" ? (
                  <MultiSelectField
                    question={q}
                    value={(answers[q.id] as string[] | undefined) ?? []}
                    otherText={(answers[`${q.id}__other`] as string) ?? ""}
                    onChange={(ids) => setAnswer(q.id, ids)}
                    onOtherText={(text) => setAnswer(`${q.id}__other`, text)}
                  />
                ) : null}

                {q.type === "matrix" ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr>
                          <th className="w-1/3 pb-2" />
                          {q.options.map((opt) => (
                            <th key={opt} className="px-2 pb-2 text-center font-normal text-(--color-ink-muted)">
                              {opt}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {q.rows.map((row) => {
                          const rowValue = (answers[q.id] as Record<string, string> | undefined)?.[row.id];
                          return (
                            <tr key={row.id} className="border-t border-(--color-hairline)/60">
                              <td className="py-2 pr-3 text-sm text-(--color-ink)">
                                {row.label}
                                {row.description ? (
                                  <p className="mt-0.5 text-xs font-normal text-(--color-ink-muted)">{row.description}</p>
                                ) : null}
                              </td>
                              {q.options.map((opt) => (
                                <td key={opt} className="px-2 py-2 text-center">
                                  <input
                                    type="radio"
                                    name={`${q.id}-${row.id}`}
                                    checked={rowValue === opt}
                                    onChange={() => setMatrixAnswer(q.id, row.id, opt)}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </Card>
            );
          })}

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Submitting..." : "Submit"}
            </Button>
            <span className="text-xs text-(--color-ink-muted)">
              {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : ""}
            </span>
          </div>
          {error ? <p className="text-sm text-[#8a3324]">{error}</p> : null}
        </>
      )}
    </div>
  );
}

function MultiSelectField({
  question,
  value,
  otherText,
  onChange,
  onOtherText,
}: {
  question: Extract<StructuredAssessmentConfig["questions"][number], { type: "multi_select" }>;
  value: string[];
  otherText: string;
  onChange: (ids: string[]) => void;
  onOtherText: (text: string) => void;
}) {
  const max = question.max;
  const atMax = max !== undefined && value.length >= max;

  function toggle(optionId: string) {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId));
      return;
    }
    if (atMax) return;
    onChange([...value, optionId]);
  }

  const otherSelected = question.otherOptionId ? value.includes(question.otherOptionId) : false;

  return (
    <div className="mt-2 space-y-1.5">
      {question.options.map((opt) => {
        const checked = value.includes(opt.id);
        const disabled = !checked && atMax;
        return (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-start gap-2 text-sm ${disabled ? "text-(--color-ink-muted)" : "text-(--color-ink)"}`}
          >
            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(opt.id)} className="mt-1" />
            <span>{opt.label}</span>
          </label>
        );
      })}
      {otherSelected && question.otherPrompt ? (
        <div className="pl-6">
          <label className="block text-xs text-(--color-ink-muted)">{question.otherPrompt}</label>
          <input
            type="text"
            value={otherText}
            onChange={(e) => onOtherText(e.target.value)}
            className={fieldClass}
          />
        </div>
      ) : null}
      {max !== undefined ? (
        <p className="text-xs text-(--color-ink-muted)">
          {value.length} / {max} selected
        </p>
      ) : null}
    </div>
  );
}
