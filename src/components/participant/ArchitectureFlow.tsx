"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calculateArchitectureRecommendation, submitArchitectureReaction } from "@/lib/actions/architecture";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LEVEL_LABEL, whatThisMeansCopy, actionCopy, withLevel } from "@/lib/executiveSupportArchitectureCopy";
import { ArchitecturePyramid } from "@/components/participant/ArchitecturePyramid";
import { cn } from "@/lib/cn";
import type { ArchitectureData, ArchitectureRecommendationView } from "@/lib/data/architecture";
import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";
import type { ArchitectureReaction, LeverageLevel } from "@/types/database";

const REACTIONS: { value: ArchitectureReaction; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "mostly", label: "Mostly" },
  { value: "not_yet", label: "Not yet" },
];

export function ArchitectureFlow({
  data,
  config,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  data: ArchitectureData;
  config: ExecutiveSupportArchitectureConfigInput | null;
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
  // Selecting a reaction only highlights it -- it does not submit or hide
  // the note field. A separate explicit Submit does that (client feedback
  // 2026-09: selecting used to auto-submit and immediately swap to a
  // read-only state, so there was never a chance to type a note).
  const [selectedReaction, setSelectedReaction] = useState<ArchitectureReaction | null>(
    data.recommendation?.reaction ?? null,
  );
  // Optimistic on the Submit click specifically (not on selection) -- the
  // click that matters shouldn't feel like it's waiting on a round-trip.
  const [submitted, setSubmitted] = useState(data.recommendation?.reaction != null);

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

  function handleSubmitReaction() {
    if (!selectedReaction) return;
    setErrorMessage(null);
    setSubmitted(true);
    startTransition(async () => {
      const result = await submitArchitectureReaction({
        participantSessionId,
        reaction: selectedReaction,
        note: note.trim() || null,
        sessionPath,
      });
      if (!result.ok) {
        setSubmitted(false);
        setErrorMessage(result.message);
      }
      // No router.refresh() on success -- local state already reflects the
      // answer, and a full page-data refetch here was the actual source of
      // the earlier multi-second stall (it shared one isPending flag with
      // the RPC itself, disabling all three buttons for the combined
      // duration).
    });
  }

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey: "architecture", sessionPath });
      router.push(sessionPath);
    });
  }

  if (!data.hasCalculated) {
    return (
      <Card>
        <p className="text-sm text-(--color-ink-muted)">
          When you&apos;re ready, explore your Executive Support Architecture.
        </p>
        <div className="mt-4">
          <Button onClick={handleCalculate} disabled={isPending}>
            {isPending ? "Loading..." : "Continue"}
          </Button>
        </div>
        {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      </Card>
    );
  }

  if (!data.revealed) {
    return (
      <Card>
        <p className="font-serif text-xl text-(--color-ink)">Your Executive Support Architecture is ready.</p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          Your facilitator will reveal it to the group during the session.
        </p>
      </Card>
    );
  }

  const rec = data.recommendation;

  if (!rec || !config || rec.signalType === "pending") {
    return (
      <div className="space-y-6">
        <Card>
          <p className="font-serif text-xl text-(--color-ink)">Your results have been recorded.</p>
          <p className="mt-2 text-sm text-(--color-ink-muted)">
            One or more of your Priority Delegation Opportunities does not yet have its leverage
            classification configured, so your Executive Support Architecture recommendation is
            pending.
          </p>
        </Card>
        <Button onClick={handleMarkComplete} disabled={isPending || alreadyComplete}>
          {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ArchitectureResult rec={rec} config={config} />

      <Card>
        <p className="text-sm text-(--color-ink)">
          Does this architecture reflect the level of support required to take meaningful ownership of
          the work you most want to transfer?
        </p>

        {submitted ? (
          <p className="mt-4 text-sm text-(--color-ink-muted)">
            You responded: <span className="text-(--color-ink)">{REACTIONS.find((r) => r.value === selectedReaction)?.label}</span>
          </p>
        ) : (
          <>
            <div className="mt-4 flex gap-2">
              {REACTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedReaction(r.value)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                    selectedReaction === r.value
                      ? "border-(--color-accent) bg-(--color-accent-soft)"
                      : "border-(--color-hairline) hover:border-(--color-accent)",
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
            <div className="mt-3">
              <Button onClick={handleSubmitReaction} disabled={!selectedReaction}>
                Submit
              </Button>
            </div>
          </>
        )}
        {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      </Card>

      <Button onClick={handleMarkComplete} disabled={!submitted || isPending || alreadyComplete}>
        {alreadyComplete ? "Module complete" : "Continue"}
      </Button>
    </div>
  );
}

function ArchitectureResult({
  rec,
  config,
}: {
  rec: ArchitectureRecommendationView;
  config: ExecutiveSupportArchitectureConfigInput;
}) {
  const highlighted = new Set<LeverageLevel>(
    [rec.primaryLeverageNeed, rec.leadingLeverageNeed, ...rec.multiLayerLevels].filter(
      (l): l is LeverageLevel => !!l,
    ),
  );
  const secondaryHighlighted = new Set<LeverageLevel>(rec.secondaryLeverageNeeds);

  return (
    <div className="space-y-6">
      <Card>
        <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
          {config.resultsHeader}
        </p>

        {rec.signalType === "multi_layer" ? (
          <div className="mt-4">
            <p className="text-sm text-(--color-ink-muted)">{config.multiLayerIntro}</p>
            <ul className="mt-4 space-y-1.5">
              {rec.multiLayerLevels.map((level) => (
                <li key={level} className="text-sm text-(--color-ink)">
                  {LEVEL_LABEL[level]} Leverage
                </li>
              ))}
            </ul>
          </div>
        ) : rec.signalType === "audit_only" && !rec.primaryLeverageNeed ? (
          <div className="mt-4">
            <p className="text-sm text-(--color-ink-muted)">{config.auditOnlyIntro}</p>
            {rec.multiLayerLevels.length > 0 ? (
              <ul className="mt-4 space-y-1.5">
                {rec.multiLayerLevels.map((level) => (
                  <li key={level} className="text-sm text-(--color-ink)">
                    {LEVEL_LABEL[level]} Leverage
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="mt-4">
            {rec.signalType === "audit_only" ? <p className="text-sm text-(--color-ink-muted)">{config.auditOnlyIntro}</p> : null}
            <p className="mt-3 text-xs text-(--color-ink-muted) uppercase tracking-wide">
              {rec.primaryLeverageNeed ? "Primary Leverage Need" : "Leading Leverage Need"}
            </p>
            <p className="mt-1 text-(--color-ink)">{LEVEL_LABEL[(rec.primaryLeverageNeed ?? rec.leadingLeverageNeed)!]} Leverage</p>
            <p className="mt-2 text-sm text-(--color-ink-muted)">
              {whatThisMeansCopy((rec.primaryLeverageNeed ?? rec.leadingLeverageNeed)!, config)}
            </p>
          </div>
        )}

        {rec.leadingLeverageNeed ? (
          <div className="mt-5 border-t border-(--color-hairline) pt-4">
            <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">{config.leadingNeedHeader}</p>
            <p className="mt-1 text-(--color-ink)">{LEVEL_LABEL[rec.leadingLeverageNeed]} Leverage</p>
            <p className="mt-2 text-sm text-(--color-ink-muted)">{withLevel(config.leadingNeedBody, rec.leadingLeverageNeed)}</p>
          </div>
        ) : null}

        {(rec.primaryLeverageNeed || rec.leadingLeverageNeed) && rec.primaryRecommendedAction ? (
          <div className="mt-5 border-t border-(--color-hairline) pt-4">
            <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Recommended Next Move</p>
            <p className="mt-2 text-sm text-(--color-ink-muted)">{actionCopy(rec.primaryRecommendedAction, config)}</p>
          </div>
        ) : null}

        {rec.auditCorroboration === "strong" && rec.primaryLeverageNeed ? (
          <div className="mt-5 border-t border-(--color-hairline) pt-4">
            <p className="text-sm font-medium text-(--color-ink)">{config.corroborationStrongHeader}</p>
            <p className="mt-2 text-sm text-(--color-ink-muted)">{withLevel(config.corroborationStrongBody, rec.primaryLeverageNeed)}</p>
          </div>
        ) : null}

        {rec.secondaryLeverageNeeds.length > 0 ? (
          <div className="mt-5 border-t border-(--color-hairline) pt-4">
            <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">{config.secondaryNeedHeader}</p>
            {rec.secondaryLeverageNeeds.map((level, i) => (
              <div key={level} className={i > 0 ? "mt-4" : "mt-2"}>
                <p className="text-(--color-ink)">{LEVEL_LABEL[level]} Leverage</p>
                {level === "systems" && rec.systemsAmplifierFlag ? (
                  <p className="mt-1 text-sm text-(--color-ink-muted)">{config.systemsAmplifierPrepend}</p>
                ) : null}
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  {actionCopy(rec.secondaryRecommendedActions[i], config)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <ArchitectureVisual highlighted={highlighted} secondaryHighlighted={secondaryHighlighted} />
    </div>
  );
}

function ArchitectureVisual({
  highlighted,
  secondaryHighlighted,
}: {
  highlighted: Set<LeverageLevel>;
  secondaryHighlighted: Set<LeverageLevel>;
}) {
  return (
    <Card>
      <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Your Recommended Roles</p>
      <p className="mt-1 text-sm text-(--color-accent)">
        An integrated support ecosystem designed to create capacity, accelerate impact and unlock leverage.
      </p>
      <p className="mt-3 text-sm text-(--color-ink)">
        Define the ownership <span className="underline underline-offset-2">before</span> you define the role.
      </p>
      <div className="mt-6">
        <ArchitecturePyramid highlighted={highlighted} secondaryHighlighted={secondaryHighlighted} />
      </div>
    </Card>
  );
}
