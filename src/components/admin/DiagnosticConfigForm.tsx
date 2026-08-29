"use client";

import { useState, useTransition } from "react";
import { saveExecutiveLeverageDiagnosticVersion } from "@/lib/actions/diagnosticConfig";
import type { DiagnosticConfig, DiagnosticConfigQuestion, DiagnosticConfigThreshold } from "@/lib/data/diagnosticConfig";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

function questionLabel(sortOrder: number) {
  if (sortOrder === 0) return "Baseline (unscored)";
  if (sortOrder === 11) return "Q11 — Context question (unscored)";
  return `Q${sortOrder}`;
}

export function DiagnosticConfigForm({ initialConfig }: { initialConfig: DiagnosticConfig }) {
  const [questions, setQuestions] = useState<DiagnosticConfigQuestion[]>(initialConfig.questions);
  const [thresholds, setThresholds] = useState<DiagnosticConfigThreshold[]>(initialConfig.thresholds);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateQuestion(index: number, patch: Partial<DiagnosticConfigQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(
    qIndex: number,
    oIndex: number,
    patch: Partial<DiagnosticConfigQuestion["options"][number]>,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)) }
          : q,
      ),
    );
  }

  function updateThreshold(index: number, patch: Partial<DiagnosticConfigThreshold>) {
    setThresholds((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveExecutiveLeverageDiagnosticVersion({
        questions: questions.map((q) => ({
          sortOrder: q.sortOrder,
          prompt: q.prompt,
          required: q.required,
          scored: q.scored,
          dashboardVisible: q.dashboardVisible,
          constraintLabel: q.constraintLabel,
          interpretationCopy: q.interpretationCopy,
          tieBreakPriority: q.tieBreakPriority,
          options: q.options.map((o) => ({
            value: o.value,
            label: o.label,
            scoreValue: o.scoreValue,
            sortOrder: o.sortOrder,
            metadata: {},
          })),
        })),
        thresholds: thresholds.map((t) => ({
          minScore: t.minScore,
          maxScore: t.maxScore,
          resultLabel: t.resultLabel,
          interpretation: t.interpretation ?? "",
          sortOrder: t.sortOrder,
        })),
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage(`Saved as version ${result.version}.`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {questions.map((q, qIndex) => (
          <details key={q.sortOrder} className="rounded-xl border border-(--color-hairline)">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium text-(--color-ink)">
              {questionLabel(q.sortOrder)}
              {q.constraintLabel ? ` — ${q.constraintLabel}` : ""}
            </summary>
            <div className="space-y-4 border-t border-(--color-hairline) px-5 py-4">
              <div>
                <label className="block text-xs font-medium text-(--color-ink-muted)">Prompt</label>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-(--color-ink-muted)">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(qIndex, { required: e.target.checked })}
                    className="accent-(--color-accent)"
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-xs text-(--color-ink-muted)">
                  <input
                    type="checkbox"
                    checked={q.scored}
                    onChange={(e) => updateQuestion(qIndex, { scored: e.target.checked })}
                    className="accent-(--color-accent)"
                  />
                  Scored
                </label>
                <label className="flex items-center gap-2 text-xs text-(--color-ink-muted)">
                  <input
                    type="checkbox"
                    checked={q.dashboardVisible}
                    onChange={(e) => updateQuestion(qIndex, { dashboardVisible: e.target.checked })}
                    className="accent-(--color-accent)"
                  />
                  Visible on facilitator dashboard
                </label>
              </div>

              {q.scored ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-(--color-ink-muted)">
                      Constraint label
                    </label>
                    <input
                      value={q.constraintLabel ?? ""}
                      onChange={(e) => updateQuestion(qIndex, { constraintLabel: e.target.value })}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-(--color-ink-muted)">
                      Tie-break priority (lower wins a tie)
                    </label>
                    <input
                      type="number"
                      value={q.tieBreakPriority ?? ""}
                      onChange={(e) =>
                        updateQuestion(qIndex, {
                          tieBreakPriority: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-(--color-ink-muted)">
                      Participant interpretation copy
                    </label>
                    <textarea
                      rows={2}
                      value={q.interpretationCopy ?? ""}
                      onChange={(e) => updateQuestion(qIndex, { interpretationCopy: e.target.value })}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-medium text-(--color-ink-muted)">Response options (display order fixed)</p>
                {q.options.map((o, oIndex) => (
                  <div key={o.value} className="flex items-center gap-3">
                    <span className="w-5 text-xs text-(--color-ink-muted)">{o.value}</span>
                    <input
                      value={o.label}
                      onChange={(e) => updateOption(qIndex, oIndex, { label: e.target.value })}
                      className={inputClass}
                    />
                    {q.scored ? (
                      <input
                        type="number"
                        min={0}
                        max={4}
                        value={o.scoreValue ?? ""}
                        onChange={(e) =>
                          updateOption(qIndex, oIndex, {
                            scoreValue: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="w-20 shrink-0 rounded-lg border border-(--color-hairline) bg-transparent px-2 py-2 text-sm outline-none focus:border-(--color-accent)"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>

      <Card>
        <h2 className="font-serif text-lg">Profile thresholds</h2>
        <div className="mt-4 space-y-4">
          {thresholds.map((t, tIndex) => (
            <div key={t.sortOrder} className="rounded-lg border border-(--color-hairline) p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-(--color-ink-muted)">Min %</label>
                  <input
                    type="number"
                    value={t.minScore ?? ""}
                    onChange={(e) =>
                      updateThreshold(tIndex, { minScore: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-(--color-ink-muted)">Max %</label>
                  <input
                    type="number"
                    value={t.maxScore ?? ""}
                    onChange={(e) =>
                      updateThreshold(tIndex, { maxScore: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-(--color-ink-muted)">Profile name</label>
                  <input
                    value={t.resultLabel}
                    onChange={(e) => updateThreshold(tIndex, { resultLabel: e.target.value })}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-(--color-ink-muted)">Profile description copy</label>
                <textarea
                  rows={2}
                  value={t.interpretation ?? ""}
                  onChange={(e) => updateThreshold(tIndex, { interpretation: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save as new version"}
        </Button>
        {message ? <p className="text-sm text-(--color-ink-muted)">{message}</p> : null}
      </div>
    </div>
  );
}
