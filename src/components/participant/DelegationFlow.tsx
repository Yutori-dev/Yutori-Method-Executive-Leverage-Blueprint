"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DelegationBeliefsFlow } from "./DelegationBeliefsFlow";
import { selectPriorityDelegationOpportunities } from "@/lib/actions/zone";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DelegationCandidatesData } from "@/lib/data/delegation";
import type { DelegationBeliefsData } from "@/lib/data/delegationBeliefs";

const REQUIRED_SELECTIONS = 3;

export function DelegationFlow({
  delegationBeliefsData,
  candidates,
  participantSessionId,
  moduleId,
  sessionId,
  sessionPath,
  alreadyComplete,
}: {
  delegationBeliefsData: DelegationBeliefsData | null;
  candidates: DelegationCandidatesData;
  participantSessionId: string;
  moduleId: string;
  sessionId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [beliefsComplete, setBeliefsComplete] = useState(delegationBeliefsData?.result !== null && delegationBeliefsData?.result !== undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(candidates.currentSelections.map((s) => s.responsibilityId)),
  );
  const [prioritiesSaved, setPrioritiesSaved] = useState(candidates.currentSelections.length === REQUIRED_SELECTIONS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const canComplete = beliefsComplete && prioritiesSaved;

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
