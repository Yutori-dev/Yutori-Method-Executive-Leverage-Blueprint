import { cn } from "@/lib/cn";
import type { RatingLevel, MacroZone } from "@/types/database";
import type { PersonalizedPlacement, ZoneCellDefinition } from "@/lib/data/zoneOfInvestment";

/** Competency is the row axis (low top -> high bottom), passion is the
 * column axis (low left -> high right) -- the client's exact orientation. */
const COMPETENCY_ORDER: RatingLevel[] = ["low", "medium", "high"];
const PASSION_ORDER: RatingLevel[] = ["low", "medium", "high"];

const ZONE_STYLES: Record<MacroZone, string> = {
  investment: "border-(--color-success) bg-(--color-success)/10",
  ambiguity: "border-(--color-accent) bg-(--color-accent-soft)",
  vulnerability: "border-(--color-locked) bg-transparent",
};

/**
 * Reusable 3x3 presentation shell. Populated with a participant's
 * responsibilities for the State 2 personalized reveal.
 */
export function ZoneMatrix({
  cells,
  placements,
}: {
  cells: ZoneCellDefinition[];
  placements: PersonalizedPlacement[];
}) {
  const cellByKey = new Map(cells.map((c) => [`${c.competencyLevel}_${c.passionLevel}`, c]));

  const placementsByCell = new Map<string, PersonalizedPlacement[]>();
  for (const p of placements) {
    const key = `${p.competencyLevel}_${p.passionLevel}`;
    placementsByCell.set(key, [...(placementsByCell.get(key) ?? []), p]);
  }

  if (cells.length === 0) {
    return (
      <p className="text-sm text-(--color-ink-muted)">
        [YUTORI CONTENT PENDING] The Zone of Investment mapping has not been configured yet, so
        the matrix cannot be displayed.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-[auto_repeat(3,1fr)] gap-2">
        <div />
        {PASSION_ORDER.map((level) => (
          <div key={level} className="text-center text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
            {level} passion
          </div>
        ))}

        {COMPETENCY_ORDER.map((competencyLevel) => (
          <div key={competencyLevel} className="contents">
            <div className="flex items-center justify-end pr-2 text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
              {competencyLevel} competency
            </div>
            {PASSION_ORDER.map((passionLevel) => {
              const key = `${competencyLevel}_${passionLevel}`;
              const cell = cellByKey.get(key);
              const inCell = placementsByCell.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[92px] rounded-xl border p-3",
                    cell ? ZONE_STYLES[cell.macroZone] : "border-(--color-hairline)",
                  )}
                >
                  {cell ? (
                    <p className="text-xs font-medium text-(--color-ink)">{cell.cellName}</p>
                  ) : (
                    <p className="text-xs text-(--color-ink-muted)">Not configured</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {inCell.map((p) => (
                      <span
                        key={p.responsibilityId}
                        className="rounded-full bg-(--color-paper-raised) px-2 py-0.5 text-[11px] text-(--color-ink)"
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-(--color-ink-muted)">
        <span className="flex items-center gap-1.5">
          <span className={cn("h-3 w-3 rounded-full border", ZONE_STYLES.investment)} /> Zone of Investment
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-3 w-3 rounded-full border", ZONE_STYLES.ambiguity)} /> Zone of Ambiguity
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-3 w-3 rounded-full border", ZONE_STYLES.vulnerability)} /> Zone of Vulnerability
        </span>
      </div>
    </div>
  );
}
