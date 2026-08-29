"use client";

import { useState } from "react";
import type { SessionAggregates, CountRow } from "@/lib/data/sessionAggregates";

const PANELS = [
  { key: "zone", label: "Zone of Investment" },
  { key: "responsibilities", label: "Top Responsibilities" },
  { key: "leverage", label: "Priority Leverage" },
  { key: "signal", label: "Primary Signal" },
  { key: "reaction", label: "Architecture Reaction" },
  { key: "identification", label: "Visionary / Integrator / Hybrid" },
] as const;

type PanelKey = (typeof PANELS)[number]["key"];

function rowsFor(aggregates: SessionAggregates, panel: PanelKey): CountRow[] {
  switch (panel) {
    case "zone":
      return aggregates.zoneDistribution;
    case "responsibilities":
      return aggregates.mostSelectedResponsibilities;
    case "leverage":
      return aggregates.priorityLeverageDistribution;
    case "signal":
      return aggregates.primarySignalDistribution;
    case "reaction":
      return aggregates.reactionDistribution;
    case "identification":
      return aggregates.selfIdentificationDistribution;
  }
}

function BigBarList({ rows }: { rows: CountRow[] }) {
  if (rows.length === 0) {
    return <p className="text-2xl text-white/50">No data yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.count));

  return (
    <div className="space-y-6">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl text-white">{row.label}</span>
            <span className="text-2xl text-white/60 tabular-nums">{row.count}</span>
          </div>
          <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-(--color-accent)"
              style={{ width: `${max === 0 ? 0 : (row.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PresentationView({ aggregates }: { aggregates: SessionAggregates }) {
  const [panel, setPanel] = useState<PanelKey>("zone");
  const activeLabel = PANELS.find((p) => p.key === panel)?.label ?? "";

  return (
    <div className="min-h-[calc(100vh-49px)] bg-neutral-950 px-8 py-10 text-white sm:px-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-white/50">
          {aggregates.registeredCount} registered · {aggregates.fullyCompletedCount} completed every
          module
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {PANELS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPanel(p.key)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                panel === p.key
                  ? "border-(--color-accent) bg-(--color-accent) text-neutral-950"
                  : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <h1 className="mt-10 font-serif text-4xl">{activeLabel}</h1>
        <div className="mt-8">
          <BigBarList rows={rowsFor(aggregates, panel)} />
        </div>
      </div>
    </div>
  );
}
