"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AssessmentForm } from "./AssessmentForm";
import { calculateDelegationReadiness, selectPriorityDelegationOpportunities } from "@/lib/actions/zone";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import type { DelegationCandidatesData, DelegationReadinessResult } from "@/lib/data/delegation";

const REQUIRED_SELECTIONS = 3;

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

/** Highest-strength dimension / primary barrier (brief section 13) --
 * a generic "which dimension scored highest/lowest" reading of whatever
 * dimensions the configured questions define, not final Yutori
 * interpretation copy (that stays content-dependent). */
function strengthAndBarrier(dimensionScores: Record<string, number>) {
  const entries = Object.entries(dimensionScores).filter(([, v]) => typeof v === "number");
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [highestDimension] = sorted[0];
  const [lowestDimension] = sorted[sorted.length - 1];
  if (highestDimension === lowestDimension) return null;
  return { highestDimension, lowestDimension };
}

export function DelegationFlow({
  assessment,
  assessmentKey,
  candidates,
  participantSessionId,
  moduleId,
  sessionId,
  sessionPath,
  alreadyComplete,
}: {
  assessment: DemoAssessment | null;
  assessmentKey: string;
  candidates: DelegationCandidatesData;
  participantSessionId: string;
  moduleId: string;
  sessionId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [requiredAnswered, setRequiredAnswered] = useState(candidates.readinessResult !== null);
  const [readinessResult, setReadinessResult] = useState<DelegationReadinessResult | null>(
    candidates.readinessResult,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(candidates.currentSelections.map((s) => s.responsibilityId)),
  );
  const [prioritiesSaved, setPrioritiesSaved] = useState(candidates.currentSelections.length === REQUIRED_SELECTIONS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCalculateReadiness() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await calculateDelegationReadiness({
        participantSessionId,
        assessmentKey,
        sessionPath,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      router.refresh();
      setReadinessResult({
        overallResult: result.overallResult,
        interpretation: result.interpretation,
        dimensionScores: result.dimensionScores,
      });
    });
  }

  function toggleCandidate(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < REQUIRED_SELECTIONS) {
        next.add(id);
      }
      return next;
    });
    setPrioritiesSaved(false);
  }

  function handleSavePriorities() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selectPriorityDelegationOpportunities({
        participantSessionId,
        responsibilityIds: [...selectedIds],
        sessionPath,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setPrioritiesSaved(true);
    });
  }

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "delegation", sessionPath });
      router.push(sessionPath);
    });
  }

  const canComplete = requiredAnswered && readinessResult !== null && prioritiesSaved;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-serif text-xl">Delegation Beliefs</h2>
        <div className="mt-4">
          {assessment ? (
            <AssessmentForm
              assessment={assessment}
              participantSessionId={participantSessionId}
              moduleId={moduleId}
              moduleKey="delegation"
              sessionPath={sessionPath}
              alreadyComplete={alreadyComplete}
              isPlaceholder
              hideCompleteButton
              onRequiredAnsweredChange={setRequiredAnswered}
            />
          ) : (
            <Card>
              <p className="text-sm text-(--color-ink-muted)">
                [YUTORI CONTENT PENDING] The Delegation Beliefs assessment has not been configured
                yet.
              </p>
            </Card>
          )}
        </div>
      </section>

      {requiredAnswered ? (
        <section>
          <h2 className="font-serif text-xl">Delegation Readiness</h2>
          <div className="mt-4">
            {readinessResult ? (
              <Card>
                <p className="text-(--color-ink)">
                  {readinessResult.overallResult ?? "Your Delegation Readiness result is pending."}
                </p>
                <p className="mt-2 text-sm text-(--color-ink-muted)">{readinessResult.interpretation}</p>
                {(() => {
                  const sb = strengthAndBarrier(readinessResult.dimensionScores);
                  if (!sb) return null;
                  return (
                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-(--color-hairline) pt-4">
                      <div>
                        <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
                          Highest-strength dimension
                        </p>
                        <p className="mt-1 text-sm text-(--color-ink)">{titleCase(sb.highestDimension)}</p>
                      </div>
                      <div>
                        <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Primary barrier</p>
                        <p className="mt-1 text-sm text-(--color-ink)">{titleCase(sb.lowestDimension)}</p>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            ) : (
              <Button onClick={handleCalculateReadiness} disabled={isPending}>
                {isPending ? "Calculating..." : "See my Delegation Readiness"}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {readinessResult ? (
        <section>
          <h2 className="font-serif text-xl">Priority Delegation Opportunities</h2>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Select exactly three responsibilities you would most value transferring out of your
            ownership.
          </p>

          <div className="mt-4">
            {candidates.eligible.length < REQUIRED_SELECTIONS ? (
              <Card>
                <p className="text-sm text-(--color-ink)">
                  You currently have {candidates.eligible.length} responsibilit
                  {candidates.eligible.length === 1 ? "y" : "ies"} outside your Zone of Investment,
                  fewer than the three needed for this step.
                </p>
                <p className="mt-2 text-sm text-(--color-ink-muted)">
                  Return to Current Structure and add or reconsider enough representative
                  responsibilities to continue.
                </p>
                <Link
                  href={`/dashboard/${sessionId}/modules/current_structure`}
                  className="mt-4 inline-block text-sm text-(--color-accent) underline underline-offset-4"
                >
                  Revisit Current Structure
                </Link>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {candidates.eligible.map((c) => {
                    const checked = selectedIds.has(c.responsibilityId);
                    const disabled = !checked && selectedIds.size >= REQUIRED_SELECTIONS;
                    return (
                      <label
                        key={c.responsibilityId}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                          checked
                            ? "border-(--color-accent) bg-(--color-accent-soft)"
                            : disabled
                              ? "border-(--color-hairline) opacity-50"
                              : "cursor-pointer border-(--color-hairline) hover:border-(--color-accent)",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleCandidate(c.responsibilityId)}
                          className="mt-0.5 accent-(--color-accent)"
                        />
                        <span>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Button
                    onClick={handleSavePriorities}
                    disabled={selectedIds.size !== REQUIRED_SELECTIONS || isPending || prioritiesSaved}
                  >
                    {prioritiesSaved ? "Saved" : isPending ? "Saving..." : "Save priority opportunities"}
                  </Button>
                  <p className="text-sm text-(--color-ink-muted)">{selectedIds.size} of 3 selected</p>
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <Button onClick={handleMarkComplete} disabled={!canComplete || isPending || alreadyComplete}>
        {alreadyComplete ? "Module complete" : "CONTINUE"}
      </Button>
    </div>
  );
}
