"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DelegationBeliefsFlow } from "./DelegationBeliefsFlow";
import { PriorityDelegationFlow } from "./PriorityDelegationFlow";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DelegationCandidatesData, PriorityDelegationConfig } from "@/lib/data/delegation";
import type { DelegationBeliefsData } from "@/lib/data/delegationBeliefs";

export function DelegationFlow({
  delegationBeliefsData,
  candidates,
  priorityDelegationConfig,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  delegationBeliefsData: DelegationBeliefsData | null;
  candidates: DelegationCandidatesData;
  priorityDelegationConfig: PriorityDelegationConfig;
  participantSessionId: string;
  moduleId: string;
  sessionId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [beliefsComplete, setBeliefsComplete] = useState(!!delegationBeliefsData?.result);
  const requiredSelectionCount = Math.min(3, candidates.eligible.length);
  const [prioritiesComplete, setPrioritiesComplete] = useState(
    requiredSelectionCount === 0 ||
      (candidates.currentSelections.length === requiredSelectionCount && candidates.pressureTest !== null),
  );
  const [isPending, startTransition] = useTransition();

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "delegation", sessionPath });
      router.push(sessionPath);
    });
  }

  const canComplete = beliefsComplete && prioritiesComplete;

  return (
    <div className="space-y-8">
      <section>
        {delegationBeliefsData ? (
          <DelegationBeliefsFlow
            data={delegationBeliefsData}
            participantSessionId={participantSessionId}
            sessionPath={sessionPath}
            onComplete={() => {
              setBeliefsComplete(true);
              router.refresh();
            }}
          />
        ) : (
          <Card>
            <p className="text-sm text-(--color-ink-muted)">
              [YUTORI CONTENT PENDING] The Delegation Beliefs assessment has not been configured
              yet.
            </p>
          </Card>
        )}
      </section>

      {beliefsComplete ? (
        <section>
          <PriorityDelegationFlow
            candidates={candidates}
            config={priorityDelegationConfig}
            participantSessionId={participantSessionId}
            sessionPath={sessionPath}
            onComplete={() => {
              setPrioritiesComplete(true);
              router.refresh();
            }}
          />
        </section>
      ) : null}

      {/*
       * Only mount this once the Beliefs stepper is done -- it can't be
       * enabled until then anyway, and rendering it disabled underneath a
       * 15-question stepper that has its own "Next"/"See my results"
       * button read as two competing, half-broken controls on the same
       * screen (client screenshot, 2026-09).
       */}
      {beliefsComplete ? (
        <Button onClick={handleMarkComplete} disabled={!canComplete || isPending || alreadyComplete}>
          {alreadyComplete ? "Module complete" : "CONTINUE"}
        </Button>
      ) : null}
    </div>
  );
}
