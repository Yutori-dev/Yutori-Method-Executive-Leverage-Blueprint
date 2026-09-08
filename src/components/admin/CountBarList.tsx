import type { CountRow } from "@/lib/data/sessionAggregates";

export function CountBarList({
  rows,
  emptyLabel,
  showPercentage = false,
}: {
  rows: CountRow[];
  emptyLabel: string;
  /** Client request 2026-09: show the share of this chart's own total as a
   * percentage instead of the raw count, so a facilitator can read the
   * distribution at a glance mid-session. Percentage is of this chart's
   * own row counts (always sums to ~100%), not registeredCount -- some
   * charts count responses per participant, others per rating/selection,
   * so a shared external denominator wouldn't be consistently meaningful. */
  showPercentage?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-(--color-ink-muted)">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((r) => r.count));
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-(--color-ink)">{row.label}</span>
            <span className="text-(--color-ink-muted)">
              {showPercentage && total > 0 ? (
                <>
                  {Math.round((row.count / total) * 100)}% <span className="text-xs">({row.count})</span>
                </>
              ) : (
                row.count
              )}
            </span>
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
