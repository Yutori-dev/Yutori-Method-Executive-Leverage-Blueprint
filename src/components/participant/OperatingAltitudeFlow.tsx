"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExecutiveLeverageDiagnosticFlow } from "./ExecutiveLeverageDiagnosticFlow";
import { markModuleComplete } from "@/lib/actions/participant";
import { Button } from "@/components/ui/Button";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import type { ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";

/**
 * Operating Altitude is now the Executive Leverage Diagnostic on its own
 * (White Whale and Leadership Wiring are standalone modules, included or
 * left out per session). Until the diagnostic is submitted the questionnaire
 * shows (and resumes); once a result is saved this module opens straight to
 * "Your Executive Leverage Profile" -- right after submitting, after a
 * refresh or sign-in, and via Back. Continuing goes to the dashboard, which
 * follows the session's configured module order.
 */
export function OperatingAltitudeFlow({
  diagnosticAssessment,
  diagnosticResult,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  diagnosticAssessment: DemoAssessment | null;
  diagnosticResult: ExecutiveLeverageProfileResult | null;
  participantSessionId: string;
  moduleId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ExecutiveLeverageProfileResult | null>(diagnosticResult);
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      // Idempotent: covers participants whose diagnostic was saved before
      // this module stopped waiting for White Whale / Leadership Wiring.
      if (!alreadyComplete) {
        await markModuleComplete({ participantSessionId, moduleId, moduleKey: "operating_altitude", sessionPath });
      }
      router.push(sessionPath);
    });
  }

  return (
    <div className="space-y-6">
      <ExecutiveLeverageDiagnosticFlow
        assessment={diagnosticAssessment}
        result={result}
        participantSessionId={participantSessionId}
        moduleId={moduleId}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
        onResultChange={setResult}
      />
      {result ? (
        <Button onClick={handleContinue} disabled={isPending}>
          {isPending ? "Saving..." : "CONTINUE"}
        </Button>
      ) : null}
    </div>
  );
}
