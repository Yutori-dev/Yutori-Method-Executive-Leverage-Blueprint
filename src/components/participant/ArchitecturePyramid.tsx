import { cn } from "@/lib/cn";
import type { LeverageLevel } from "@/types/database";

const LEVEL_LABEL: Record<LeverageLevel, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

const PYRAMID_LAYERS: {
  level: Exclude<LeverageLevel, "systems">;
  tagline: string;
  description: string;
  roles: string[];
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
    tagline: "Leadership Leverage",
    description: "Owns work that requires meaningful judgment, decision-making and leadership authority.",
    roles: ["Chief of Staff", "Chief Integrator", "COO"],
    containerWidthPct: 100 / 3,
    previousBandWidthPct: 0,
  },
  {
    level: "orchestration",
    tagline: "Coordination Leverage",
    description: "Owns the flow of information, priorities, commitments and activity around the executive.",
    roles: ["Executive Assistant", "Senior Executive Assistant"],
    containerWidthPct: (100 * 2) / 3,
    previousBandWidthPct: 100 / 3,
  },
  {
    level: "execution",
    tagline: "Task Leverage",
    description: "Owns defined tasks and outputs that can be reliably executed by others.",
    roles: ["Personal Assistant", "Administrative Assistant / Virtual Assistant"],
    containerWidthPct: 100,
    previousBandWidthPct: (100 * 2) / 3,
  },
];

const SYSTEMS_LAYER = {
  tagline: "Leverage that amplifies every layer",
  description: "Uses AI and automation to absorb, automate and accelerate recurring work across the architecture.",
  roles: ["AI agents", "Automated workflows", "Supporting technology infrastructure"],
};

const LEGEND_LAYERS: { level: LeverageLevel; tagline: string; description: string; roles: string[] }[] = [
  ...PYRAMID_LAYERS.map((l) => ({ level: l.level as LeverageLevel, tagline: l.tagline, description: l.description, roles: l.roles })),
  { level: "systems", ...SYSTEMS_LAYER },
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
}: {
  highlighted: Set<LeverageLevel>;
  secondaryHighlighted: Set<LeverageLevel>;
}) {
  function bandStateClasses(level: LeverageLevel) {
    if (highlighted.has(level)) return "bg-(--color-accent) text-(--color-paper)";
    if (secondaryHighlighted.has(level)) return "bg-(--color-accent-soft) text-(--color-ink)";
    // Not the Card's own background (--color-paper-raised) -- a neutral
    // band needs to actually be visible against the card it sits inside.
    return "bg-(--color-hairline) text-(--color-ink-muted)";
  }

  return (
    <div>
      <div className="mx-auto flex max-w-sm flex-col items-center">
        {PYRAMID_LAYERS.map((layer) => (
          <div
            key={layer.level}
            className="flex items-center justify-center"
            style={{
              width: `${layer.containerWidthPct}%`,
              height: "72px",
              clipPath: bandClipPath(layer.containerWidthPct, layer.previousBandWidthPct),
              marginTop: layer.level === "strategic" ? 0 : "3px",
            }}
          >
            <div className={cn("flex h-full w-full items-end justify-center pb-2.5 transition-colors", bandStateClasses(layer.level))}>
              <p className="text-xs font-semibold tracking-wide uppercase">{LEVEL_LABEL[layer.level]}</p>
            </div>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "mx-auto mt-1 flex max-w-sm items-center justify-center rounded-lg py-2.5 transition-colors",
          bandStateClasses("systems"),
        )}
      >
        <p className="text-xs font-semibold tracking-wide uppercase">{LEVEL_LABEL.systems}</p>
      </div>

      <div className="mt-6 space-y-4">
        {LEGEND_LAYERS.map(
          (layer) => (
            <div key={layer.level} className="flex items-start justify-between gap-3 border-t border-(--color-hairline) pt-3 first:border-t-0 first:pt-0">
              <div>
                <p className="text-sm font-medium text-(--color-ink)">
                  {LEVEL_LABEL[layer.level]} — {layer.tagline}
                </p>
                <p className="mt-0.5 text-xs text-(--color-ink-muted)">{layer.description}</p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">{layer.roles.join(" · ")}</p>
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
          ),
        )}
      </div>
    </div>
  );
}
