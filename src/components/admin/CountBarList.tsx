import type { CountRow } from "@/lib/data/sessionAggregates";

export function CountBarList({ rows, emptyLabel }: { rows: CountRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-(--color-ink-muted)">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((r) => r.count));

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-(--color-ink)">{row.label}</span>
            <span className="text-(--color-ink-muted)">{row.count}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--color-accent-soft)">
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
