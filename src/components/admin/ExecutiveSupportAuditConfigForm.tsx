"use client";

import { useState, useTransition } from "react";
import { saveExecutiveSupportAuditConfigVersion } from "@/lib/actions/executiveSupportAuditConfig";
import type { ExecutiveSupportAuditConfigInput } from "@/lib/actions/executiveSupportAuditConfig";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { LeverageLevel } from "@/types/database";

const LAYERS: LeverageLevel[] = ["execution", "orchestration", "strategic", "systems"];
const LAYER_LABEL: Record<LeverageLevel, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

export function ExecutiveSupportAuditConfigForm({ initialConfig }: { initialConfig: ExecutiveSupportAuditConfigInput }) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateQuestion(sortOrder: number, patch: Partial<ExecutiveSupportAuditConfigInput["questions"][number]>) {
    setConfig((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.sortOrder === sortOrder ? { ...q, ...patch } : q)),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveExecutiveSupportAuditConfigVersion(config);
      setMessage(result.ok ? `Saved as version ${result.version}.` : result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">Introduction &amp; results copy</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Header</label>
            <input
              value={config.introHeader}
              onChange={(e) => setConfig((prev) => ({ ...prev, introHeader: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Subheader</label>
            <input
              value={config.introSubheader}
              onChange={(e) => setConfig((prev) => ({ ...prev, introSubheader: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Body</label>
            <textarea
              rows={2}
              value={config.introBody}
              onChange={(e) => setConfig((prev) => ({ ...prev, introBody: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Results intro copy</label>
            <textarea
              rows={2}
              value={config.resultsIntroCopy}
              onChange={(e) => setConfig((prev) => ({ ...prev, resultsIntroCopy: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">
              Secondary threshold (min score to qualify)
            </label>
            <input
              type="number"
              value={config.secondaryThreshold}
              onChange={(e) => setConfig((prev) => ({ ...prev, secondaryThreshold: Number(e.target.value) }))}
              className="mt-1 w-32 rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">No-clear-secondary copy</label>
            <textarea
              rows={2}
              value={config.noSecondaryCopy}
              onChange={(e) => setConfig((prev) => ({ ...prev, noSecondaryCopy: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Interpretation copy</h2>
        {LAYERS.map((layer) => (
          <div key={layer} className="mt-4 border-t border-(--color-hairline) pt-4 first:mt-0 first:border-t-0 first:pt-0">
            <p className="text-sm font-medium text-(--color-ink)">{LAYER_LABEL[layer]}</p>
            <div className="mt-2">
              <label className="block text-xs font-medium text-(--color-ink-muted)">Primary interpretation</label>
              <textarea
                rows={2}
                value={config.primaryCopy[layer]}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, primaryCopy: { ...prev.primaryCopy, [layer]: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
            <div className="mt-2">
              <label className="block text-xs font-medium text-(--color-ink-muted)">Secondary interpretation</label>
              <textarea
                rows={2}
                value={config.secondaryCopy[layer]}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, secondaryCopy: { ...prev.secondaryCopy, [layer]: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Questions</h2>
        <div className="mt-3 space-y-4">
          {config.questions.map((q) => (
            <div key={q.sortOrder} className="rounded-lg border border-(--color-hairline) p-3">
              <p className="text-xs text-(--color-ink-muted)">Q{q.sortOrder}</p>
              <textarea
                rows={2}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.sortOrder, { prompt: e.target.value })}
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <div className="mt-2 space-y-2">
                {LAYERS.map((layer) => (
                  <div key={layer}>
                    <label className="block text-xs font-medium text-(--color-ink-muted)">{LAYER_LABEL[layer]} option</label>
                    <input
                      value={q.options[layer]}
                      onChange={(e) => updateQuestion(q.sortOrder, { options: { ...q.options, [layer]: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-1.5 text-sm outline-none focus:border-(--color-accent)"
                    />
                  </div>
                ))}
              </div>
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
