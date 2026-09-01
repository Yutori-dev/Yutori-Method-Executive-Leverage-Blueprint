import { cn } from "@/lib/cn";
import { LEVEL_TAGLINE, LEVEL_ROLES } from "@/lib/blueprintCopy";
import type { LeverageLevel } from "@/types/database";

const LEVEL_LABEL: Record<LeverageLevel, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

const PYRAMID_LAYERS: {
  level: Exclude<LeverageLevel, "systems">;
  description: string;
  /** This band's own container width, and the width of the band directly
   * above it (0 for the apex, which has no band above it) -- both as a
   * percent of the whole pyramid. The three stack (1/3, 2/3, 3/3 widths)
   * into one continuous triangle silhouette; each band's clip-path tapers
   * its top edge in from the sides to exactly match the narrower band
   * stacked above it. */
  containerWidthPct: number;
  previousBandWidthPct: number;
}[] = [
  {
    level: "strategic",
    description: "Owns work that requires meaningful judgment, decision-making and leadership authority.",
    containerWidthPct: 100 / 3,
    previousBandWidthPct: 0,
  },
  {
    level: "orchestration",
    description: "Owns the flow of information, priorities, commitments and activity around the executive.",
    containerWidthPct: (100 * 2) / 3,
    previousBandWidthPct: 100 / 3,
  },
  {
    level: "execution",
    description: "Owns defined tasks and outputs that can be reliably executed by others.",
    containerWidthPct: 100,
    previousBandWidthPct: (100 * 2) / 3,
  },
];

const SYSTEMS_DESCRIPTION = "Uses AI and automation to absorb, automate and accelerate recurring work across the architecture.";

const LEGEND_LAYERS: { level: LeverageLevel; description: string }[] = [
  ...PYRAMID_LAYERS.map((l) => ({ level: l.level as LeverageLevel, description: l.description })),
  { level: "systems", description: SYSTEMS_DESCRIPTION },
];

/** Renders each trapezoid band's shape via clip-path, sized so the three
 * stack into a continuous triangle (apex = strategic, base = execution),
 * with Systems as a full-width foundation band beneath -- "operates
 * across the broader architecture rather than a higher human-support
 * tier" (spec section 15). */
function bandClipPath(containerWidthPct: number, previousBandWidthPct: number): string {
  if (previousBandWidthPct === 0) {
    // Apex: a plain triangle filling its own box.
    return "polygon(50% 0%, 100% 100%, 0% 100%)";
  }
  // Top edge width, as a percent of THIS band's own box, equals the
  // narrower band stacked above it, relative to this band's own width.
  const topEdgePct = (previousBandWidthPct / containerWidthPct) * 100;
  const inset = (100 - topEdgePct) / 2;
  return `polygon(${inset}% 0%, ${100 - inset}% 0%, 100% 100%, 0% 100%)`;
}

export function ArchitecturePyramid({
  highlighted,
  secondaryHighlighted,
  variant = "full",
}: {
  highlighted: Set<LeverageLevel>;
  secondaryHighlighted: Set<LeverageLevel>;
  /** "mini" drops the legend text block and shrinks the graphic -- used by
   * the Blueprint's "Your Office of the CEO" section, which pairs the
   * pyramid with its own separate Primary/Secondary summary panel instead
   * of this component's full description/roles legend. */
  variant?: "full" | "mini";
}) {
  const isMini = variant === "mini";

  function bandStateClasses(level: LeverageLevel) {
    if (highlighted.has(level)) return "bg-(--color-accent) text-(--color-paper)";
    if (secondaryHighlighted.has(level)) return "bg-(--color-accent-soft) text-(--color-ink)";
    // Not the Card's own background (--color-paper-raised) -- a neutral
    // band needs to actually be visible against the card it sits inside.
    return "bg-(--color-hairline) text-(--color-ink-muted)";
  }

  const maxWidthClass = isMini ? "max-w-[180px]" : "max-w-sm";
  const bandHeight = isMini ? "40px" : "72px";

  return (
    <div>
      <div className={cn("mx-auto flex flex-col items-center", maxWidthClass)}>
        {PYRAMID_LAYERS.map((layer) => (
          <div
            key={layer.level}
            className="flex items-center justify-center"
            style={{
              width: `${layer.containerWidthPct}%`,
              height: bandHeight,
              clipPath: bandClipPath(layer.containerWidthPct, layer.previousBandWidthPct),
              marginTop: layer.level === "strategic" ? 0 : "3px",
            }}
          >
            <div
              className={cn(
                "flex h-full w-full items-end justify-center transition-colors",
                isMini ? "pb-1.5" : "pb-2.5",
                bandStateClasses(layer.level),
              )}
            >
              <p className={cn("font-semibold tracking-wide uppercase", isMini ? "text-[9px]" : "text-xs")}>
                {LEVEL_LABEL[layer.level]}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "mx-auto mt-1 flex items-center justify-center rounded-lg transition-colors",
          maxWidthClass,
          isMini ? "py-1.5" : "py-2.5",
          bandStateClasses("systems"),
        )}
      >
        <p className={cn("font-semibold tracking-wide uppercase", isMini ? "text-[9px]" : "text-xs")}>{LEVEL_LABEL.systems}</p>
      </div>

      {!isMini && (
        <div className="mt-6 space-y-4">
          {LEGEND_LAYERS.map((layer) => (
            <div
              key={layer.level}
              className="flex items-start justify-between gap-3 border-t border-(--color-hairline) pt-3 first:border-t-0 first:pt-0"
            >
              <div>
                <p className="text-sm font-medium text-(--color-ink)">
                  {LEVEL_LABEL[layer.level]} — {LEVEL_TAGLINE[layer.level]}
                </p>
                <p className="mt-0.5 text-xs text-(--color-ink-muted)">{layer.description}</p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">{LEVEL_ROLES[layer.level].join(" · ")}</p>
              </div>
              {highlighted.has(layer.level) ? (
                <span className="shrink-0 rounded-full bg-(--color-accent) px-2.5 py-0.5 text-xs font-medium text-(--color-paper)">
                  Primary
                </span>
              ) : secondaryHighlighted.has(layer.level) ? (
                <span className="shrink-0 rounded-full border border-(--color-accent) px-2.5 py-0.5 text-xs font-medium text-(--color-ink)">
                  Secondary
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
