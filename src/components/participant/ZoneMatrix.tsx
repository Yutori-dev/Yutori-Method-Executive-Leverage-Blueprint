import { cn } from "@/lib/cn";
import type { RatingLevel, MacroZone } from "@/types/database";
import type { RatedResponsibility, ZoneCellDefinition } from "@/lib/data/zoneOfInvestment";

const COMPETENCY_ORDER: RatingLevel[] = ["low", "medium", "high"];
const PASSION_ORDER: RatingLevel[] = ["high", "medium", "low"];

const ZONE_STYLES: Record<MacroZone, string> = {
  investment: "border-(--color-success) bg-(--color-success)/10",
  ambiguity: "border-(--color-accent) bg-(--color-accent-soft)",
  vulnerability: "border-(--color-locked) bg-transparent",
};

/**
 * Reusable 3x3 presentation shell -- deliberately plain (no final Yutori
 * visual treatment yet, task instructions section 7). Swapping in the
 * approved design later is a styling change to this one component, not a
 * rework of the underlying data/calculation.
 */
export function ZoneMatrix({
  cells,
  responsibilities,
}: {
  cells: ZoneCellDefinition[];
  responsibilities: RatedResponsibility[];
}) {
  const cellByKey = new Map(cells.map((c) => [`${c.competencyLevel}_${c.passionLevel}`, c]));

  const responsibilitiesByCell = new Map<string, RatedResponsibility[]>();
  for (const r of responsibilities) {
    if (!r.competency || !r.passion) continue;
    const key = `${r.competency}_${r.passion}`;
    responsibilitiesByCell.set(key, [...(responsibilitiesByCell.get(key) ?? []), r]);
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
        {COMPETENCY_ORDER.map((level) => (
          <div key={level} className="text-center text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
            {level} competency
          </div>
        ))}

        {PASSION_ORDER.map((passionLevel) => (
          <div key={passionLevel} className="contents">
            <div className="flex items-center justify-end pr-2 text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
              {passionLevel} passion
            </div>
            {COMPETENCY_ORDER.map((competencyLevel) => {
              const key = `${competencyLevel}_${passionLevel}`;
              const cell = cellByKey.get(key);
              const inCell = responsibilitiesByCell.get(key) ?? [];
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
                    {inCell.map((r) => (
                      <span
                        key={r.responsibilityId}
                        className="rounded-full bg-(--color-paper-raised) px-2 py-0.5 text-[11px] text-(--color-ink)"
                      >
                        {r.label}
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
