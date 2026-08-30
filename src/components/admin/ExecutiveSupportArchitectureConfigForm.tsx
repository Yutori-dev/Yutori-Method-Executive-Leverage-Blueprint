"use client";

import { useState, useTransition } from "react";
import { saveExecutiveSupportArchitectureConfigVersion } from "@/lib/actions/executiveSupportArchitectureConfig";
import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const FIELDS: { key: keyof ExecutiveSupportArchitectureConfigInput; label: string; rows?: number }[] = [
  { key: "resultsHeader", label: "Results header (shown on every result screen)" },
  { key: "auditOnlyIntro", label: "Audit-only intro (zero Priority Leverage Opportunities)", rows: 2 },
  { key: "multiLayerIntro", label: "Multi-Layer intro", rows: 2 },
  { key: "leadingNeedHeader", label: "Leading Leverage Need header" },
  { key: "leadingNeedBody", label: "Leading Leverage Need body ({level} placeholder)", rows: 2 },
  { key: "secondaryNeedHeader", label: "Secondary Leverage Need header" },
  { key: "systemsAmplifierPrepend", label: "Systems-as-secondary prepend copy", rows: 2 },
  { key: "corroborationStrongHeader", label: "Strong corroboration header" },
  { key: "corroborationStrongBody", label: "Strong corroboration body ({level} placeholder)", rows: 2 },
  { key: "whatThisMeansExecution", label: "What This Means -- Execution", rows: 2 },
  { key: "whatThisMeansOrchestration", label: "What This Means -- Orchestration", rows: 2 },
  { key: "whatThisMeansStrategic", label: "What This Means -- Strategic", rows: 2 },
  { key: "whatThisMeansSystems", label: "What This Means -- Systems", rows: 2 },
  { key: "strengthenExecutionCopy", label: "Next move -- strengthen existing Execution", rows: 2 },
  { key: "addExecutionCopy", label: "Next move -- add Execution", rows: 2 },
  { key: "strengthenOrchestrationCopy", label: "Next move -- strengthen existing Orchestration", rows: 2 },
  { key: "evolveOrAddOrchestrationCopy", label: "Next move -- evolve or add Orchestration (Execution-only support)", rows: 2 },
  { key: "addOrchestrationCopy", label: "Next move -- add Orchestration (no existing support)", rows: 2 },
  { key: "strengthenStrategicCopy", label: "Next move -- strengthen existing Strategic", rows: 2 },
  { key: "addStrategicFromOrchestrationCopy", label: "Next move -- add Strategic (Orchestration support present)", rows: 2 },
  { key: "addStrategicCopy", label: "Next move -- add Strategic (no classified support)", rows: 2 },
  { key: "strengthenSystemsCopy", label: "Next move -- strengthen existing Systems", rows: 2 },
  { key: "addSystemsCopy", label: "Next move -- add Systems", rows: 2 },
];

export function ExecutiveSupportArchitectureConfigForm({
  initialConfig,
}: {
  initialConfig: ExecutiveSupportArchitectureConfigInput;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveExecutiveSupportArchitectureConfigVersion(config);
      setMessage(result.ok ? `Saved as version ${result.version}.` : result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <div className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-(--color-ink-muted)">{field.label}</label>
              {field.rows ? (
                <textarea
                  rows={field.rows}
                  value={config[field.key]}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
                />
              ) : (
                <input
                  value={config[field.key]}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
                />
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
