"use client";

import { useState, useTransition } from "react";
import { savePriorityLeverageRevealConfigVersion } from "@/lib/actions/priorityLeverageRevealConfig";
import type { PriorityLeverageRevealConfigInput } from "@/lib/actions/priorityLeverageRevealConfig";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function PriorityLeverageRevealConfigForm({ initialConfig }: { initialConfig: PriorityLeverageRevealConfigInput }) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await savePriorityLeverageRevealConfigVersion(config);
      setMessage(result.ok ? `Saved as version ${result.version}.` : result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">Reveal screen copy</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Reveal header</label>
            <input
              value={config.revealHeader}
              onChange={(e) => setConfig((prev) => ({ ...prev, revealHeader: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Reveal intro</label>
            <textarea
              rows={2}
              value={config.revealIntro}
              onChange={(e) => setConfig((prev) => ({ ...prev, revealIntro: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Leverage Pattern header</label>
            <input
              value={config.leveragePatternHeader}
              onChange={(e) => setConfig((prev) => ({ ...prev, leveragePatternHeader: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Audit context header</label>
            <input
              value={config.auditContextHeader}
              onChange={(e) => setConfig((prev) => ({ ...prev, auditContextHeader: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">
              No-clear-secondary-gap label
            </label>
            <input
              value={config.noSecondaryGapLabel}
              onChange={(e) => setConfig((prev) => ({ ...prev, noSecondaryGapLabel: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Interpretation headline</label>
            <input
              value={config.interpretationHeadline}
              onChange={(e) => setConfig((prev) => ({ ...prev, interpretationHeadline: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Interpretation body</label>
            <textarea
              rows={3}
              value={config.interpretationBody}
              onChange={(e) => setConfig((prev) => ({ ...prev, interpretationBody: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
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
