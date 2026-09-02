"use client";

import { useState } from "react";
import {
  saveDelegationBeliefResponse,
  calculateDelegationBeliefsResults,
} from "@/lib/actions/delegationBeliefs";
import type { DelegationBeliefsData } from "@/lib/data/delegationBeliefs";
import { DOMAIN_LABEL, type DelegationDomain } from "@/lib/delegationBeliefsConstants";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const BELIEF_SCALE = [
  { score: 1, label: "Strongly Disagree" },
  { score: 2, label: "Disagree" },
  { score: 3, label: "Neutral" },
  { score: 4, label: "Agree" },
  { score: 5, label: "Strongly Agree" },
];

const OWNERSHIP_SCALE = [
  { score: 1, label: "Rarely / Not True" },
  { score: 2, label: "Sometimes" },
  { score: 3, label: "Often" },
  { score: 4, label: "Usually" },
  { score: 5, label: "Consistently / Very True" },
];

export function DelegationBeliefsFlow({
  data,
  participantSessionId,
  sessionPath,
  onComplete,
}: {
  data: DelegationBeliefsData;
  participantSessionId: string;
  sessionPath: string;
  onComplete: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(data.responses);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (data.result) {
    return <DelegationBeliefsResults data={data} />;
  }

  const question = data.questions[index];
  const isFirstOfOwnershipTransfer = question.section === "ownership_transfer" && data.questions[index - 1]?.section === "belief";
  const scale = question.section === "belief" ? BELIEF_SCALE : OWNERSHIP_SCALE;
  const isLast = index === data.questions.length - 1;

  // Auto-advances on selection instead of requiring a separate "Next" click
  // -- matches the Executive Support Audit flow's pattern (client feedback
  // 2026-09: "make it the same as the leverage exercise").
  async function handleSelect(score: number) {
    setErrorMessage(null);
    setAnswers((prev) => ({ ...prev, [question.id]: score }));
    setSaving(true);

    const result = await saveDelegationBeliefResponse({ participantSessionId, questionId: question.id, score });
    if (!result.ok) {
      setSaving(false);
      setErrorMessage(result.message);
      return;
    }

    if (!isLast) {
      setSaving(false);
      setIndex((i) => i + 1);
      return;
    }

    const calcResult = await calculateDelegationBeliefsResults({ participantSessionId, sessionPath });
    setSaving(false);
    if (!calcResult.ok) {
      setErrorMessage(calcResult.message);
      return;
    }
    onComplete();
  }

  return (
    <div className="space-y-4">
      {index === 0 ? (
        <Card>
          <h2 className="font-serif text-xl">Delegation Beliefs Assessment</h2>
          <p className="mt-3 text-sm text-(--color-ink-muted)">{data.config.introCopy}</p>
        </Card>
      ) : null}

      {isFirstOfOwnershipTransfer ? (
        // Not <Card> -- Card's own bg-(--color-paper-raised) would coexist
        // with a second bg-* utility here via cn()'s plain string join (no
        // dedupe), the exact class of bug just fixed in the Zone of
        // Investment rating picker. A standalone element sidesteps it.
        <div className="rounded-2xl border border-(--color-info) bg-(--color-info-soft) p-6 sm:p-8">
          <h2 className="font-serif text-xl text-(--color-ink)">How Ownership Transfers Today</h2>
          <p className="mt-3 text-sm text-(--color-ink)">{data.config.ownershipTransferIntro}</p>
        </div>
      ) : null}

      <Card>
        <p className="text-xs text-(--color-ink-muted)">
          Question {index + 1} of {data.questions.length}
        </p>
        <p className="mt-2 text-(--color-ink)">{question.prompt}</p>
        <div className="mt-4 space-y-2">
          {scale.map((option) => (
            <button
              key={option.score}
              type="button"
              onClick={() => handleSelect(option.score)}
              disabled={saving}
              className={cn(
                "w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                answers[question.id] === option.score
                  ? "border-(--color-accent) bg-(--color-accent-soft)"
                  : "border-(--color-hairline) hover:border-(--color-accent)",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}
    </div>
  );
}

function DelegationBeliefsResults({ data }: { data: DelegationBeliefsData }) {
  const result = data.result!;
  const domains: DelegationDomain[] = ["trust_control", "team_outcomes", "workload_resources"];
  const avgByDomain: Record<DelegationDomain, number> = {
    trust_control: result.trustControlAvg,
    team_outcomes: result.teamOutcomesAvg,
    workload_resources: result.workloadResourcesAvg,
  };
  const sortedDomains = [...domains].sort((a, b) => avgByDomain[b] - avgByDomain[a]);

  function copyForDomain(domain: DelegationDomain) {
    const avg = avgByDomain[domain];
    const copy = data.config.domainCopy[domain];
    if (avg <= data.config.thresholdLowMax) return copy.low;
    if (avg <= data.config.thresholdMidMax) return copy.mid;
    return copy.high;
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-xl">Your Delegation Beliefs</h2>
        <p className="mt-3 text-sm text-(--color-ink-muted)">Potential barriers to successful delegation</p>

        {result.strongestBarrierDomains.length > 0 ? (
          <p className="mt-3 text-xs tracking-wide text-(--color-accent) uppercase">
            Your strongest barrier{result.strongestBarrierDomains.length > 1 ? "s" : ""}:{" "}
            {result.strongestBarrierDomains.map((d) => DOMAIN_LABEL[d]).join(", ")}
          </p>
        ) : (
          <p className="mt-3 text-sm text-(--color-ink)">
            No primary barrier surfaced. Your responses did not surface a single clear primary
            barrier across the three areas assessed.
          </p>
        )}

        <div className="mt-4 space-y-4 border-t border-(--color-hairline) pt-4">
          {sortedDomains.map((domain) => (
            <div key={domain}>
              <p className="text-sm text-(--color-ink)">
                {DOMAIN_LABEL[domain]} — {avgByDomain[domain].toFixed(1)} / 5
              </p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">{copyForDomain(domain)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-xl">Where Could Ownership Transfer More Effectively?</h2>
        {result.flaggedOpportunities.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-(--color-ink-muted)">
              Your responses surfaced the following opportunities to strengthen how ownership
              transfers from you to others.
            </p>
            <div className="mt-4 space-y-4 border-t border-(--color-hairline) pt-4">
              {result.flaggedOpportunities.map((o) => (
                <div key={o.id}>
                  <p className="text-sm text-(--color-ink)">{o.label}</p>
                  <p className="mt-1 text-sm text-(--color-ink-muted)">{o.interpretation}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-(--color-ink)">
            Your responses did not surface a clear ownership-transfer opportunity across the five
            practices assessed.
          </p>
        )}
      </Card>
    </div>
  );
}
