"use client";

import { useState, useTransition } from "react";
import { savePriorityDelegationConfig } from "@/lib/actions/priorityDelegationConfig";
import type { PriorityDelegationConfig } from "@/lib/data/delegation";
import { Button } from "@/components/ui/Button";

const FIELDS: { key: keyof PriorityDelegationConfig; label: string; rows?: number }[] = [
  { key: "introCopy", label: "Introduction copy (3+ eligible)", rows: 4 },
  { key: "fewerThanThreeCopy", label: "Fewer-than-three copy", rows: 2 },
  { key: "zeroEligibleCopy", label: "Zero-eligible copy", rows: 2 },
  { key: "zoneAmbiguityDescription", label: "Zone of Ambiguity description", rows: 2 },
  { key: "zoneVulnerabilityDescription", label: "Zone of Vulnerability description", rows: 2 },
  { key: "pressureTestQuestion", label: "Pressure-test question", rows: 2 },
  { key: "somewhatNoFollowupCopy", label: "Somewhat/No follow-up copy", rows: 2 },
  { key: "confirmationCopy", label: "Confirmation copy", rows: 2 },
];

export function PriorityDelegationConfigForm({ initialConfig }: { initialConfig: PriorityDelegationConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await savePriorityDelegationConfig(config);
      setMessage(result.ok ? "Saved a new version." : result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label htmlFor={field.key} className="block text-xs font-medium text-(--color-ink-muted)">
            {field.label}
          </label>
          <textarea
            id={field.key}
            rows={field.rows ?? 2}
            value={config[field.key]}
            onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
      ))}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save new version"}
        </Button>
        {message ? <p className="text-sm text-(--color-ink-muted)">{message}</p> : null}
      </div>
    </form>
  );
}
