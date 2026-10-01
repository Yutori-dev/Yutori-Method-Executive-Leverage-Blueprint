"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLeverageAuditAnswers, submitLeverageAudit } from "@/lib/actions/leverageAudit";
import { missingLeverageAuditFields, type LeverageAuditAnswers, type LeverageAuditConfig } from "@/lib/leverageAuditSchema";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * EA Leverage & Orchestration Audit capture (both variants -- config's
 * `variant` field only changes copy, this component's behavior is
 * identical for Visionary and EA). Doesn't reuse StructuredAssessmentFlow:
 * each responsibility is a linked pair of questions (Current Ownership,
 * then Desired Direction with an option conditionally hidden based on the
 * first answer) plus a branching early-exit on the first context question
 * -- none of which the generic single/multi-select engine models.
 */
export function LeverageAuditFlow({
  assessmentId,
  versionId,
  moduleId,
  moduleKey,
  sessionId,
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
  sessionId: string;
  config: LeverageAuditConfig;
  initialAnswers: LeverageAuditAnswers;
  alreadyComplete: boolean;
  participantSessionId: string;
  sessionPath: string;
  resultsView?: React.ReactNode;
}) {
  const router = useRouter();
  // A brand-new participant has no submission row at all yet, so
  // getStructuredAssessment hands back a bare `{}` rather than this
  // shape's context/responses keys -- normalize once here rather than at
  // every call site that reads answers.context / answers.responses.
  const [answers, setAnswers] = useState<LeverageAuditAnswers>({
    context: initialAnswers?.context ?? {},
    responses: initialAnswers?.responses ?? {},
    noCurrentEa: initialAnswers?.noCurrentEa,
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: LeverageAuditAnswers) => {
      setSaveState("saving");
      saveLeverageAuditAnswers({ participantSessionId, assessmentId, versionId, answers: next }).then((result) =>
        setSaveState(result.ok ? "saved" : "idle"),
      );
    },
    [participantSessionId, assessmentId, versionId],
  );

  function scheduleSave(next: LeverageAuditAnswers) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 500);
  }

  function setContext(questionId: string, value: string) {
    const exitQuestion = config.contextQuestions.find((q) => q.id === questionId && q.exitOnValue === value);
    const next: LeverageAuditAnswers = {
      ...answers,
      context: { ...answers.context, [questionId]: value },
      noCurrentEa: exitQuestion ? true : answers.noCurrentEa,
    };
    setAnswers(next);
    scheduleSave(next);
  }

  function setOwnership(responsibilityId: string, value: 0 | 1 | 2 | 3 | 4) {
    const existing = answers.responses[responsibilityId] ?? {};
    // Changing Current Ownership away from 0 can invalidate a previously
    // selected "Less ownership than today" (only valid when current = 0 is
    // not the case -- actually the hidden option is the reverse: "Less" is
    // hidden when current = 0; here we only need to clear a stale answer
    // if it's no longer a valid option for the new current value).
    const desired = value === 0 && existing.desired === -1 ? undefined : existing.desired;
    const next: LeverageAuditAnswers = {
      ...answers,
      responses: { ...answers.responses, [responsibilityId]: { ...existing, current: value, desired } },
    };
    setAnswers(next);
    scheduleSave(next);
  }

  function setDesired(responsibilityId: string, value: -1 | 0 | 1) {
    const existing = answers.responses[responsibilityId] ?? {};
    const next: LeverageAuditAnswers = {
      ...answers,
      responses: { ...answers.responses, [responsibilityId]: { ...existing, desired: value } },
    };
    setAnswers(next);
    scheduleSave(next);
  }

  const missing = missingLeverageAuditFields(config, answers);

  function handleSubmit() {
    setError(null);
    if (missing.length > 0) {
      setShowMissing(true);
      setError("A few required questions are still blank -- they're marked below.");
      return;
    }
    startTransition(async () => {
      const result = await submitLeverageAudit({
        participantSessionId,
        assessmentId,
        versionId,
        moduleId,
        moduleKey,
        sessionPath,
        sessionId,
        answers,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(sessionPath);
    });
  }

  if (alreadyComplete && resultsView) return <>{resultsView}</>;

  if (answers.noCurrentEa) {
    return (
      <div className="space-y-6">
        <Card>
          <p className="text-sm text-(--color-ink)">{config.exitMessage}</p>
          <div className="mt-4">
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Continue"}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-[#8a3324]">{error}</p> : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">{config.intro.title}</h2>
        {config.intro.body.map((p, i) => (
          <p key={i} className="mt-2 text-sm text-(--color-ink-muted)">
            {p}
          </p>
        ))}
      </Card>

      {config.contextQuestions.map((q) => {
        const isMissing = showMissing && missing.includes(`context.${q.id}`);
        return (
          <Card key={q.id} className={isMissing ? "border-[#8a3324]" : ""}>
            <p className="text-sm text-(--color-ink)">{q.prompt}</p>
            <div className="mt-2 space-y-1.5">
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
      })}

      {config.responsibilities.map((r) => {
        const response = answers.responses[r.id] ?? {};
        const currentMissing = showMissing && missing.includes(`${r.id}.current`);
        const desiredMissing = showMissing && missing.includes(`${r.id}.desired`);
        return (
          <Card key={r.id} className={currentMissing || desiredMissing ? "border-[#8a3324]" : ""}>
            <h3 className="text-sm font-medium text-(--color-ink)">{r.name}</h3>
            <p className="mt-1 text-xs text-(--color-ink-muted)">{r.description}</p>

            <p className="mt-4 text-sm text-(--color-ink)">
              What level of ownership does {config.variant === "ea" ? "your executive" : "your EA"} currently have in this
              area?
            </p>
            <div className="mt-2 space-y-1.5">
              {config.ownershipLevels.map((level) => (
                <label key={level.value} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
                  <input
                    type="radio"
                    name={`${r.id}-current`}
                    checked={response.current === level.value}
                    onChange={() => setOwnership(r.id, level.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{level.label}.</span> {level.description}
                  </span>
                </label>
              ))}
            </div>

            {response.current !== undefined ? (
              <>
                <p className="mt-4 text-sm text-(--color-ink)">
                  What level of ownership {config.variant === "ea" ? "would you like to have" : "do you want from your EA"}{" "}
                  in this area?
                </p>
                <div className="mt-2 space-y-1.5">
                  {config.directionOptions
                    .filter((d) => !(response.current === 0 && d.value === -1))
                    .map((d) => (
                      <label key={d.value} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
                        <input
                          type="radio"
                          name={`${r.id}-desired`}
                          checked={response.desired === d.value}
                          onChange={() => setDesired(r.id, d.value)}
                          className="mt-1"
                        />
                        <span>{d.label}</span>
                      </label>
                    ))}
                </div>
              </>
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
    </div>
  );
}
