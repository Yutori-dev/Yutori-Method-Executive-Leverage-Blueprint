"use client";

import { useEffect, useState, useTransition } from "react";
import {
  selectPriorityDelegationOpportunities,
  savePressureTestResponse,
  markPriorityDelegationRevisited,
} from "@/lib/actions/zone";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DelegationCandidatesData, PriorityDelegationConfig } from "@/lib/data/delegation";

type Phase = "select" | "pressure_test" | "revisit_prompt" | "confirmed";
type PressureResponse = "yes" | "somewhat" | "no";

export function PriorityDelegationFlow({
  candidates,
  config,
  participantSessionId,
  sessionPath,
  onComplete,
}: {
  candidates: DelegationCandidatesData;
  config: PriorityDelegationConfig;
  participantSessionId: string;
  sessionPath: string;
  onComplete: () => void;
}) {
  const requiredCount = Math.min(3, candidates.eligible.length);
  const alreadySelected = candidates.currentSelections.length === requiredCount;

  const [phase, setPhase] = useState<Phase>(() => {
    if (requiredCount === 0) return "confirmed";
    if (!alreadySelected) return "select";
    if (!candidates.pressureTest) return "pressure_test";
    return "confirmed";
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(candidates.currentSelections.map((s) => s.responsibilityId)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (requiredCount === 0) {
    return (
      <Card>
        <h2 className="font-serif text-xl">Your Priority Delegation Opportunities</h2>
        <p className="mt-3 text-sm text-(--color-ink)">{config.zeroEligibleCopy}</p>
      </Card>
    );
  }

  function toggleCandidate(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < requiredCount) {
        next.add(id);
      }
      return next;
    });
  }

  function handleSaveSelections() {
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
      setPhase("pressure_test");
    });
  }

  function handlePressureTest(response: PressureResponse) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await savePressureTestResponse({ participantSessionId, response, sessionPath });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setPhase(response === "yes" ? "confirmed" : "revisit_prompt");
    });
  }

  function handleRevisit() {
    startTransition(async () => {
      await markPriorityDelegationRevisited({ participantSessionId, sessionPath });
      setPhase("select");
    });
  }

  function handleKeep() {
    setPhase("confirmed");
  }

  if (phase === "select") {
    const ambiguity = candidates.eligible.filter((c) => c.macroZone === "ambiguity");
    const vulnerability = candidates.eligible.filter((c) => c.macroZone === "vulnerability");
    const fewerThanThree = candidates.eligible.length < 3;

    return (
      <Card>
        <h2 className="font-serif text-xl">Your Priority Delegation Opportunities</h2>
        <p className="mt-3 text-sm text-(--color-ink)">
          {fewerThanThree ? config.fewerThanThreeCopy : config.introCopy}
        </p>

        {ambiguity.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Zone of Ambiguity</p>
            <p className="mt-1 text-xs text-(--color-ink-muted)">{config.zoneAmbiguityDescription}</p>
            <div className="mt-2 space-y-2">
              {ambiguity.map((c) => (
                <CandidateOption key={c.responsibilityId} candidate={c} selected={selectedIds.has(c.responsibilityId)} requiredCount={requiredCount} selectedCount={selectedIds.size} onToggle={toggleCandidate} />
              ))}
            </div>
          </div>
        ) : null}

        {vulnerability.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Zone of Vulnerability</p>
            <p className="mt-1 text-xs text-(--color-ink-muted)">{config.zoneVulnerabilityDescription}</p>
            <div className="mt-2 space-y-2">
              {vulnerability.map((c) => (
                <CandidateOption key={c.responsibilityId} candidate={c} selected={selectedIds.has(c.responsibilityId)} requiredCount={requiredCount} selectedCount={selectedIds.size} onToggle={toggleCandidate} />
              ))}
            </div>
          </div>
        ) : null}

        {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}

        <div className="mt-5 flex items-center gap-4">
          <Button onClick={handleSaveSelections} disabled={selectedIds.size !== requiredCount || isPending}>
            {isPending ? "Saving..." : "Continue"}
          </Button>
          <p className="text-sm text-(--color-ink-muted)">
            {selectedIds.size} of {requiredCount} selected
          </p>
        </div>
      </Card>
    );
  }

  const selectedLabels = candidates.currentSelections.map((s) => s.label);

  if (phase === "pressure_test") {
    return (
      <Card>
        <h2 className="font-serif text-xl">Your Priority Delegation Opportunities</h2>
        <ul className="mt-3 space-y-1 text-sm text-(--color-ink)">
          {selectedLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-(--color-ink)">{config.pressureTestQuestion}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["yes", "somewhat", "no"] as PressureResponse[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handlePressureTest(option)}
              disabled={isPending}
              className="rounded-lg border border-(--color-hairline) px-4 py-2 text-sm capitalize transition-colors hover:border-(--color-accent)"
            >
              {option}
            </button>
          ))}
        </div>
        {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      </Card>
    );
  }

  if (phase === "revisit_prompt") {
    return (
      <Card>
        <h2 className="font-serif text-xl">Your Priority Delegation Opportunities</h2>
        <p className="mt-3 text-sm text-(--color-ink)">{config.somewhatNoFollowupCopy}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={handleRevisit} disabled={isPending}>
            Revisit my selections
          </Button>
          <Button onClick={handleKeep} disabled={isPending}>
            Keep these selections
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-serif text-xl">Your Priority Delegation Opportunities</h2>
      <ul className="mt-3 space-y-1 text-sm text-(--color-ink)">
        {selectedLabels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-(--color-ink-muted)">{config.confirmationCopy}</p>
      <PriorityDelegationCompleteSignal onComplete={onComplete} />
    </Card>
  );
}

function CandidateOption({
  candidate,
  selected,
  requiredCount,
  selectedCount,
  onToggle,
}: {
  candidate: { responsibilityId: string; label: string };
  selected: boolean;
  requiredCount: number;
  selectedCount: number;
  onToggle: (id: string) => void;
}) {
  const disabled = !selected && selectedCount >= requiredCount;
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
        selected
          ? "border-(--color-accent) bg-(--color-accent-soft)"
          : disabled
            ? "border-(--color-hairline) opacity-50"
            : "cursor-pointer border-(--color-hairline) hover:border-(--color-accent)",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={() => onToggle(candidate.responsibilityId)}
        className="mt-0.5 accent-(--color-accent)"
      />
      <span>{candidate.label}</span>
    </label>
  );
}

// Fires onComplete once on reaching the confirmed screen, so the parent
// (DelegationFlow) can enable the module's own CONTINUE button.
function PriorityDelegationCompleteSignal({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
