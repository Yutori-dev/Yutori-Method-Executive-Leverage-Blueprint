"use client";

import { useState, useTransition } from "react";
import { AssessmentForm } from "./AssessmentForm";
import { ExecutiveLeverageProfileView } from "./ExecutiveLeverageProfileView";
import { calculateExecutiveLeverageDiagnostic } from "@/lib/actions/executiveLeverageDiagnostic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import type { ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";

/** Executive Leverage Diagnostic (TM) -- Developer Implementation
 * Specification V1. Mirrors DelegationFlow's "assessment -> calculate ->
 * show interpreted result" shape. Never renders a score or percentage
 * anywhere -- the action this calls is incapable of returning one.
 *
 * Once a result exists (just submitted, or saved from an earlier visit) the
 * questionnaire is replaced by the "Your Executive Leverage Profile" page;
 * an incomplete diagnostic keeps the questionnaire and its resume behavior.
 * If saving fails the answers stay on screen and Submit can simply be
 * pressed again -- a result that was not saved is never shown. */
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
      const outcome = await calculateExecutiveLeverageDiagnostic({ participantSessionId, sessionPath, moduleId });
      if (!outcome.ok) {
        setErrorMessage(`We couldn't save your answers (${outcome.message}). Your answers are still here -- please try submitting again.`);
        return;
      }
      const next: ExecutiveLeverageProfileResult = {
        profileLabel: outcome.profileLabel ?? "",
        profileDescription: outcome.profileDescription,
        strongestConstraints: outcome.strongestConstraints,
        cards: outcome.cards,
      };
      setProfileResult(next);
      onResultChange(next);
    });
  }

  if (profileResult) {
    return <ExecutiveLeverageProfileView result={profileResult} />;
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
          <Button onClick={handleCalculate} disabled={isPending}>
            {isPending ? "Calculating..." : "Submit"}
          </Button>
        </section>
      ) : null}

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}
    </div>
  );
}
