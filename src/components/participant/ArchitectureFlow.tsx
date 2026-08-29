"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateArchitectureRecommendation, submitArchitectureReaction } from "@/lib/actions/architecture";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ArchitectureData } from "@/lib/data/architecture";
import type { ArchitectureReaction } from "@/types/database";

const REACTIONS: { value: ArchitectureReaction; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "mostly", label: "Mostly" },
  { value: "not_yet", label: "Not yet" },
];

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

export function ArchitectureFlow({
  data,
  participantSessionId,
  moduleId,
  sessionId,
  sessionPath,
  alreadyComplete,
}: {
  data: ArchitectureData;
  participantSessionId: string;
  moduleId: string;
  sessionId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [note, setNote] = useState(data.recommendation?.reactionNote ?? "");

  function handleCalculate() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await calculateArchitectureRecommendation({ participantSessionId, sessionPath });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleReaction(reaction: ArchitectureReaction) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await submitArchitectureReaction({
        participantSessionId,
        reaction,
        note: note.trim() || null,
        sessionPath,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "architecture", sessionPath });
      router.refresh();
    });
  }

  if (!data.priorityOpportunitiesReady) {
    return (
      <Card>
        <p className="text-sm text-(--color-ink)">
          Complete your Priority Delegation Opportunities in the Delegation module first.
        </p>
        <Link
          href={`/dashboard/${sessionId}/modules/delegation`}
          className="mt-4 inline-block text-sm text-(--color-accent) underline underline-offset-4"
        >
          Go to Delegation
        </Link>
      </Card>
    );
  }

  if (!data.hasCalculated) {
    return (
      <Card>
        <p className="text-sm text-(--color-ink-muted)">
          Your Priority Delegation Opportunities are in. When you&apos;re ready, calculate your
          Executive Support Architecture.
        </p>
        <div className="mt-4">
          <Button onClick={handleCalculate} disabled={isPending}>
            {isPending ? "Calculating..." : "Calculate my Blueprint"}
          </Button>
        </div>
        {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      </Card>
    );
  }

  if (!data.revealed) {
    return (
      <Card>
        <p className="font-serif text-xl text-(--color-ink)">Your Blueprint is ready.</p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          Your facilitator will reveal your Executive Support Architecture to the group during the
          session.
        </p>
      </Card>
    );
  }

  const rec = data.recommendation;

  return (
    <div className="space-y-6">
      <Card>
        <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
          Your Executive Support Architecture
        </p>
        <p className="mt-4 text-(--color-ink)">
          {rec?.primaryResult ?? "Mixed leverage profile"}
        </p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">{rec?.rationale}</p>

        {rec && rec.supportingSignals.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
              Based on the opportunities you selected
            </p>
            <ul className="mt-2 space-y-1.5">
              {rec.supportingSignals.map((s) => (
                <li key={s.selectionOrder} className="flex items-center justify-between text-sm">
                  <span className="text-(--color-ink)">{s.responsibilityLabel}</span>
                  <span className="text-(--color-ink-muted)">
                    {LEVEL_LABEL[s.leverageLevelSnapshot] ?? s.leverageLevelSnapshot}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card>
        <p className="text-sm text-(--color-ink)">
          Does this architecture reflect the support required to take meaningful ownership of the
          work you most want to transfer?
        </p>

        {rec?.reaction ? (
          <p className="mt-4 text-sm text-(--color-ink-muted)">
            You responded: <span className="text-(--color-ink)">{REACTIONS.find((r) => r.value === rec.reaction)?.label}</span>
          </p>
        ) : (
          <>
            <div className="mt-4 flex gap-2">
              {REACTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => handleReaction(r.value)}
                  disabled={isPending}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                    "border-(--color-hairline) hover:border-(--color-accent)",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              placeholder="Optional: tell us what feels incomplete or unexpected."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </>
        )}
        {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      </Card>

      <Button onClick={handleMarkComplete} disabled={!rec?.reaction || isPending || alreadyComplete}>
        {alreadyComplete ? "Module complete" : "Mark module complete"}
      </Button>
    </div>
  );
}
