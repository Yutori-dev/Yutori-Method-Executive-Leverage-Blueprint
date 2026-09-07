"use client";

import { useState } from "react";
import type { SessionAggregates, CountRow } from "@/lib/data/sessionAggregates";

const PANELS = [
  { key: "zone", label: "Zone of Investment", moduleKey: "current_structure" },
  { key: "responsibilities", label: "Top Responsibilities", moduleKey: "current_structure" },
  { key: "leverage", label: "Priority Leverage", moduleKey: "leverage" },
  { key: "signal", label: "Primary Signal", moduleKey: "architecture" },
  { key: "reaction", label: "Architecture Reaction", moduleKey: "architecture" },
  { key: "identification", label: "Leadership Wiring", moduleKey: "operating_altitude" },
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

export function PresentationView({
  aggregates,
  disabledModuleKeys = [],
}: {
  aggregates: SessionAggregates;
  /** Panels whose module was disabled for this session don't have anything
   * to show -- filtered out rather than left showing "No data yet." for a
   * module that was never going to run. */
  disabledModuleKeys?: string[];
}) {
  const disabledSet = new Set(disabledModuleKeys);
  const visiblePanels = PANELS.filter((p) => !disabledSet.has(p.moduleKey));
  const [panel, setPanel] = useState<PanelKey>(() => visiblePanels[0]?.key ?? PANELS[0].key);
  const activeLabel = PANELS.find((p) => p.key === panel)?.label ?? "";

  return (
    <div className="min-h-[calc(100vh-49px)] bg-neutral-950 px-8 py-10 text-white sm:px-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-white/50">
          {aggregates.registeredCount} registered · {aggregates.fullyCompletedCount} completed every
          module
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {visiblePanels.map((p) => (
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
