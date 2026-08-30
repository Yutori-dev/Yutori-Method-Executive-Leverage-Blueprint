"use client";

import { useState, useTransition } from "react";
import { saveDelegationBeliefsConfigVersion } from "@/lib/actions/delegationBeliefsConfig";
import type { DelegationBeliefsConfigInput } from "@/lib/actions/delegationBeliefsConfig";
import { DOMAIN_LABEL, type DelegationDomain } from "@/lib/delegationBeliefsConstants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const DOMAINS: DelegationDomain[] = ["trust_control", "team_outcomes", "workload_resources"];

export function DelegationBeliefsConfigForm({ initialConfig }: { initialConfig: DelegationBeliefsConfigInput }) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateQuestion(sortOrder: number, patch: Partial<DelegationBeliefsConfigInput["questions"][number]>) {
    setConfig((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.sortOrder === sortOrder ? { ...q, ...patch } : q)),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveDelegationBeliefsConfigVersion(config);
      setMessage(result.ok ? `Saved as version ${result.version}.` : result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">Introductory copy</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Delegation Beliefs intro</label>
            <textarea
              rows={4}
              value={config.introCopy}
              onChange={(e) => setConfig((prev) => ({ ...prev, introCopy: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Ownership Transfer intro</label>
            <textarea
              rows={2}
              value={config.ownershipTransferIntro}
              onChange={(e) => setConfig((prev) => ({ ...prev, ownershipTransferIntro: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Domain interpretation copy</h2>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          Low: average ≤ {config.thresholdLowMax}. Mid: ≤ {config.thresholdMidMax}. High: above that.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Low threshold max</label>
            <input
              type="number"
              step="0.01"
              value={config.thresholdLowMax}
              onChange={(e) => setConfig((prev) => ({ ...prev, thresholdLowMax: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Mid threshold max</label>
            <input
              type="number"
              step="0.01"
              value={config.thresholdMidMax}
              onChange={(e) => setConfig((prev) => ({ ...prev, thresholdMidMax: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
        </div>

        {DOMAINS.map((domain) => (
          <div key={domain} className="mt-4 border-t border-(--color-hairline) pt-4">
            <p className="text-sm font-medium text-(--color-ink)">{DOMAIN_LABEL[domain]}</p>
            {(["low", "mid", "high"] as const).map((range) => (
              <div key={range} className="mt-2">
                <label className="block text-xs font-medium text-(--color-ink-muted) capitalize">{range}</label>
                <textarea
                  rows={2}
                  value={config.domainCopy[domain][range]}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      domainCopy: {
                        ...prev.domainCopy,
                        [domain]: { ...prev.domainCopy[domain], [range]: e.target.value },
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </div>
            ))}
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Questions</h2>
        <div className="mt-3 space-y-4">
          {config.questions.map((q) => (
            <div key={q.sortOrder} className="rounded-lg border border-(--color-hairline) p-3">
              <p className="text-xs text-(--color-ink-muted)">
                Q{q.sortOrder} · {q.section === "belief" ? "Delegation Belief" : "Ownership Transfer Indicator"}
              </p>
              <textarea
                rows={2}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.sortOrder, { prompt: e.target.value })}
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />

              {q.section === "belief" ? (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-(--color-ink-muted)">Scoring domain</label>
                  <select
                    value={q.domain ?? "trust_control"}
                    onChange={(e) => updateQuestion(q.sortOrder, { domain: e.target.value as DelegationDomain })}
                    className="mt-1 rounded-lg border border-(--color-hairline) bg-transparent px-3 py-1.5 text-sm outline-none focus:border-(--color-accent)"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {DOMAIN_LABEL[d]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-(--color-ink-muted)">Opportunity label</label>
                    <input
                      value={q.opportunityLabel ?? ""}
                      onChange={(e) => updateQuestion(q.sortOrder, { opportunityLabel: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-1.5 text-sm outline-none focus:border-(--color-accent)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-(--color-ink-muted)">
                      &ldquo;Rarely / Not True&rdquo; interpretation
                    </label>
                    <textarea
                      rows={2}
                      value={q.rarelyInterpretation ?? ""}
                      onChange={(e) => updateQuestion(q.sortOrder, { rarelyInterpretation: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-(--color-ink-muted)">
                      &ldquo;Sometimes&rdquo; interpretation
                    </label>
                    <textarea
                      rows={2}
                      value={q.sometimesInterpretation ?? ""}
                      onChange={(e) => updateQuestion(q.sortOrder, { sometimesInterpretation: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save new version"}
        </Button>
        {message ? <p className="text-sm text-(--color-ink-muted)">{message}</p> : null}
      </div>
    </form>
  );
}
