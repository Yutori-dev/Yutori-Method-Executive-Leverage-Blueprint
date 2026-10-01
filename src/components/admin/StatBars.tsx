import { fmtPct } from "@/lib/assessmentStats";

/** Count + percentage rows with a proportional bar -- used by every
 * facilitator dashboard so they read the same way. */
export function StatBars({ rows }: { rows: { label: string; count?: number; pct: number }[] }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-(--color-ink)">{r.label}</span>
            <span className="shrink-0 text-(--color-ink-muted)">
              {r.count !== undefined ? `${r.count} · ` : ""}
              {fmtPct(r.pct)}
            </span>
          </div>
          <div className="mt-0.5 h-1.5 rounded-full bg-(--color-hairline)">
            <div className="h-1.5 rounded-full bg-(--color-accent)" style={{ width: `${Math.min(100, Math.max(0, r.pct))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CompletionBlock({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs text-(--color-ink-muted)">{i.label}</dt>
          <dd className="font-serif text-xl text-(--color-ink)">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
