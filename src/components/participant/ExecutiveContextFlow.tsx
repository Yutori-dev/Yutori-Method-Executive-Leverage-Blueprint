"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssessmentForm } from "./AssessmentForm";
import type { DemoAssessment } from "@/lib/data/moduleContent";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Brief section 7, Module 0 -- a one-time step before the main module
 * sequence, not one of the seven dashboard modules itself, so it has no
 * module id/progress row of its own. "Done" is inferred the same way
 * required-question completeness is checked everywhere else. */
export function ExecutiveContextFlow({
  assessment,
  sessionId,
  participantSessionId,
}: {
  assessment: DemoAssessment | null;
  sessionId: string;
  participantSessionId: string;
}) {
  const router = useRouter();
  const [requiredAnswered, setRequiredAnswered] = useState(assessment === null);

  if (!assessment) {
    return (
      <Card>
        <p className="text-sm text-(--color-ink-muted)">
          [YUTORI CONTENT PENDING] Executive context questions are not configured yet.
        </p>
        <div className="mt-4">
          <Button onClick={() => router.push(`/dashboard/${sessionId}`)}>Continue to dashboard</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AssessmentForm
        assessment={assessment}
        participantSessionId={participantSessionId}
        moduleId=""
        moduleKey="module_0_context"
        sessionPath={`/dashboard/${sessionId}`}
        alreadyComplete={false}
        hideCompleteButton
        onRequiredAnsweredChange={setRequiredAnswered}
      />
      <Button
        onClick={() => {
          router.push(`/dashboard/${sessionId}`);
          router.refresh();
        }}
        disabled={!requiredAnswered}
      >
        Continue to dashboard
      </Button>
    </div>
  );
}
