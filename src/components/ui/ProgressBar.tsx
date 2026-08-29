export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--color-accent-soft)">
        <div
          className="h-full rounded-full bg-(--color-accent) transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-(--color-ink-muted)">
        {completed} of {total} modules complete
      </p>
    </div>
  );
}
