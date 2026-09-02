"use client";

import { useState, useTransition } from "react";
import { AssessmentForm } from "./AssessmentForm";
import { calculateExecutiveLeverageDiagnostic } from "@/lib/actions/executiveLeverageDiagnostic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import type { ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";

/** Executive Leverage Diagnostic (TM) -- Developer Implementation
 * Specification V1. Mirrors DelegationFlow's "assessment -> calculate ->
 * show interpreted result" shape. Never renders a score or percentage
 * anywhere -- the action this calls is incapable of returning one. */
export function ExecutiveLeverageDiagnosticFlow({
  assessment,
  result,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
  onResultChange,
}: {
  assessment: DemoAssessment | null;
  result: ExecutiveLeverageProfileResult | null;
  participantSessionId: string;
  moduleId: string;
  sessionPath: string;
  alreadyComplete: boolean;
  onResultChange: (result: ExecutiveLeverageProfileResult | null) => void;
}) {
  const [requiredAnswered, setRequiredAnswered] = useState(result !== null);
  const [profileResult, setProfileResult] = useState<ExecutiveLeverageProfileResult | null>(result);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCalculate() {
    setErrorMessage(null);
    startTransition(async () => {
      const outcome = await calculateExecutiveLeverageDiagnostic({ participantSessionId, sessionPath });
      if (!outcome.ok) {
        setErrorMessage(outcome.message);
        return;
      }
      const next: ExecutiveLeverageProfileResult = {
        profileLabel: outcome.profileLabel ?? "",
        profileDescription: outcome.profileDescription,
        strongestConstraints: outcome.strongestConstraints,
      };
      setProfileResult(next);
      onResultChange(next);
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-serif text-xl">Executive Leverage Diagnostic™</h2>
        <div className="mt-4">
          {assessment ? (
            <AssessmentForm
              assessment={assessment}
              participantSessionId={participantSessionId}
              moduleId={moduleId}
              moduleKey="operating_altitude"
              sessionPath={sessionPath}
              alreadyComplete={alreadyComplete}
              isPlaceholder={false}
              hideCompleteButton
              onRequiredAnsweredChange={setRequiredAnswered}
            />
          ) : (
            <Card>
              <p className="text-sm text-(--color-ink-muted)">
                [YUTORI CONTENT PENDING] The Executive Leverage Diagnostic has not been configured
                yet.
              </p>
            </Card>
          )}
        </div>
      </section>

      {requiredAnswered ? (
        <section>
          <h2 className="font-serif text-xl">Your Executive Leverage Profile</h2>
          <div className="mt-4">
            {profileResult ? (
              <Card>
                <p className="font-serif text-lg text-(--color-ink)">{profileResult.profileLabel}</p>
                {profileResult.profileDescription ? (
                  <p className="mt-2 text-sm text-(--color-ink-muted)">
                    {profileResult.profileDescription}
                  </p>
                ) : null}

                {profileResult.strongestConstraints.length > 0 ? (
                  <div className="mt-6 space-y-4 border-t border-(--color-hairline) pt-4">
                    <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
                      Strongest Leverage Constraints
                    </p>
                    {profileResult.strongestConstraints.map((c) => (
                      <div key={c.label}>
                        <p className="text-sm font-medium text-(--color-ink)">{c.label}</p>
                        <p className="mt-1 text-sm text-(--color-ink-muted)">{c.interpretation}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ) : (
              <Button onClick={handleCalculate} disabled={isPending}>
                {isPending ? "Calculating..." : "Submit"}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}
    </div>
  );
}
