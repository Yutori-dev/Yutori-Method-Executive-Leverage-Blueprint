"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveStructuredAssessmentAnswers,
  submitStructuredAssessment,
} from "@/lib/actions/structuredAssessments";
import {
  missingStartStopShiftCategories,
  type StartStopShiftAnswers,
  type StartStopShiftConfig,
} from "@/lib/startStopShiftSchema";
import type { Json } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Start-Stop-Shift: free-text commitment lists, not the fixed-question
 * engine -- purpose-built rather than reusing StructuredAssessmentFlow
 * (see the migration's comment). Once complete, opens straight to the
 * review screen (spec requirement) with an Edit path back into the entry
 * form -- unlike Thinking Traps' results, this module's spec explicitly
 * allows revisiting and changing commitments after completion.
 */
export function StartStopShiftFlow({
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
  config: StartStopShiftConfig;
  initialAnswers: StartStopShiftAnswers;
  alreadyComplete: boolean;
  participantSessionId: string;
  sessionPath: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<StartStopShiftAnswers>(initialAnswers);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(!alreadyComplete);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: StartStopShiftAnswers) => {
      setSaveState("saving");
      saveStructuredAssessmentAnswers({
        participantSessionId,
        assessmentId,
        versionId,
        answers: next as unknown as Record<string, Json>,
      }).then((result) => setSaveState(result.ok ? "saved" : "idle"));
    },
    [participantSessionId, assessmentId, versionId],
  );

  function scheduleSave(next: StartStopShiftAnswers) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 500);
  }

  function addEntry(categoryId: string) {
    const text = (drafts[categoryId] ?? "").trim();
    if (!text) return;
    const existing = answers[categoryId] ?? [];
    // Adding the same line twice (a double click, or Enter then the button)
    // would just show it twice and later offer it twice on the next screen.
    if (existing.some((e) => e.trim().toLowerCase() === text.toLowerCase())) {
      setDrafts((d) => ({ ...d, [categoryId]: "" }));
      return;
    }
    const next = { ...answers, [categoryId]: [...existing, text] };
    setAnswers(next);
    setDrafts((d) => ({ ...d, [categoryId]: "" }));
    scheduleSave(next);
  }

  function removeEntry(categoryId: string, index: number) {
    const next = { ...answers, [categoryId]: (answers[categoryId] ?? []).filter((_, i) => i !== index) };
    setAnswers(next);
    scheduleSave(next);
  }

  const missing = missingStartStopShiftCategories(config, answers);

  function handleContinue() {
    setError(null);
    if (missing.length > 0) {
      setError("Add at least one commitment in every category before continuing.");
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
        answers: answers as unknown as Record<string, Json>,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        <Card>
          <h2 className="font-serif text-lg">{config.review.title}</h2>
          <div className="mt-4 space-y-4">
            {config.categories.map((c) => (
              <div key={c.id}>
                <h3 className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{c.label}</h3>
                <ul className="mt-1 space-y-1">
                  {(answers[c.id] ?? []).map((entry, i) => (
                    <li key={i} className="text-sm text-(--color-ink)">
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-(--color-ink-muted)">{config.review.closing}</p>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => router.push(sessionPath)}>Continue</Button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Edit
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">{config.intro.title}</h2>
        <div className="mt-2 space-y-2 text-sm text-(--color-ink-muted)">
          {config.intro.body.map((p, i) => (
            <p key={i} className={i === 0 ? "text-(--color-ink)" : ""}>
              {p}
            </p>
          ))}
        </div>
      </Card>

      {config.categories.map((c) => {
        const entries = answers[c.id] ?? [];
        const isMissing = missing.includes(c.id) && error !== null;
        return (
          <Card key={c.id} className={isMissing ? "border-[#8a3324]" : ""}>
            <h3 className="text-sm font-medium text-(--color-ink)">{c.label}</h3>
            <p className="mt-1 text-sm text-(--color-ink)">{c.prompt}</p>
            <p className="mt-1 text-xs text-(--color-ink-muted)">{c.helper}</p>

            {entries.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {entries.map((entry, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 rounded-lg border border-(--color-hairline) px-3 py-2 text-sm text-(--color-ink)">
                    <span>{entry}</span>
                    <button
                      type="button"
                      onClick={() => removeEntry(c.id, i)}
                      className="shrink-0 text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-[#8a3324]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 flex gap-2">
              <input
                value={drafts[c.id] ?? ""}
                placeholder={c.field_prefix}
                onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEntry(c.id);
                  }
                }}
                className="min-w-0 flex-1 rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <Button onClick={() => addEntry(c.id)}>+ Add</Button>
            </div>
            <p className="mt-2 text-xs text-(--color-ink-muted)">Example: {c.example}</p>
          </Card>
        );
      })}

      <div className="flex items-center gap-3">
        <Button onClick={handleContinue} disabled={isPending}>
          {isPending ? "Saving..." : "Continue"}
        </Button>
        <span className="text-xs text-(--color-ink-muted)">
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : ""}
        </span>
      </div>
      {error ? <p className="text-sm text-[#8a3324]">{error}</p> : null}
    </div>
  );
}
