import type { ComponentType, ReactNode } from "react";
import { Svg, Polygon, Rect, Text } from "@react-pdf/renderer";
import type { LeverageLevel } from "@/types/database";

/** @react-pdf/renderer's SVGTextProps type omits `fontSize`, even though
 * the renderer reads it directly off the element's props at layout time
 * (confirmed in @react-pdf/layout's getFragments -- a type-defs gap, not a
 * runtime one) -- narrow cast once here instead of repeating it per usage. */
const SvgLabel = Text as unknown as ComponentType<{
  x: number;
  y: number;
  textAnchor?: "start" | "middle" | "end";
  fontSize: number;
  fill: string;
  children: ReactNode;
}>;

/**
 * PDF equivalent of ArchitecturePyramid.tsx's "mini" variant. @react-pdf/
 * renderer has no CSS clip-path, so the trapezoid bands that component
 * builds via clip-path are redrawn here as literal Polygon point math --
 * same geometry (1/3, 2/3, 3/3 stacked widths forming one continuous
 * triangle, Systems as a full-width band below), same 3-state fill
 * palette, different rendering primitives.
 */
const W = 150;
const BAND_H = 24;
const GAP = 2;
const SYSTEMS_H = 18;

const ACCENT = "#6b5a3e";
const ACCENT_SOFT = "#efe9dd";
const HAIRLINE = "#e4e1da";
const PAPER = "#ffffff";
const INK_MUTED = "#5b6270";

const LAYERS: { level: Exclude<LeverageLevel, "systems">; containerWidthPct: number; previousBandWidthPct: number }[] = [
  { level: "strategic", containerWidthPct: 100 / 3, previousBandWidthPct: 0 },
  { level: "orchestration", containerWidthPct: (100 * 2) / 3, previousBandWidthPct: 100 / 3 },
  { level: "execution", containerWidthPct: 100, previousBandWidthPct: (100 * 2) / 3 },
];

const LEVEL_LABEL: Record<LeverageLevel, string> = {
  strategic: "STRATEGIC",
  orchestration: "ORCHESTRATION",
  execution: "EXECUTION",
  systems: "SYSTEMS",
};

function fillFor(level: LeverageLevel, highlighted: Set<LeverageLevel>, secondaryHighlighted: Set<LeverageLevel>) {
  if (highlighted.has(level)) return ACCENT;
  if (secondaryHighlighted.has(level)) return ACCENT_SOFT;
  return HAIRLINE;
}

function textColorFor(level: LeverageLevel, highlighted: Set<LeverageLevel>) {
  return highlighted.has(level) ? PAPER : INK_MUTED;
}

export function ArchitecturePyramidPdf({
  highlighted,
  secondaryHighlighted,
}: {
  highlighted: Set<LeverageLevel>;
  secondaryHighlighted: Set<LeverageLevel>;
}) {
  const bands = LAYERS.map((layer, index) => {
    // Every band is the same height, so its top offset is just index *
    // (band height + gap) -- no running accumulator needed.
    const top = index * (BAND_H + GAP);
    const bottom = top + BAND_H;
    const bandWidth = (W * layer.containerWidthPct) / 100;
    const topWidth = (W * layer.previousBandWidthPct) / 100;
    const left = (W - bandWidth) / 2;
    const topLeft = (W - topWidth) / 2;
    const topRight = topLeft + topWidth;
    const bottomLeft = left;
    const bottomRight = left + bandWidth;
    const points =
      topWidth === 0
        ? `${W / 2},${top} ${bottomRight},${bottom} ${bottomLeft},${bottom}`
        : `${topLeft},${top} ${topRight},${top} ${bottomRight},${bottom} ${bottomLeft},${bottom}`;
    return { level: layer.level as LeverageLevel, points, labelY: bottom - 7 };
  });

  const systemsTop = LAYERS.length * (BAND_H + GAP);
  const totalHeight = systemsTop + SYSTEMS_H;

  return (
    <Svg width={W} height={totalHeight} viewBox={`0 0 ${W} ${totalHeight}`}>
      {bands.map((b) => (
        <Polygon key={b.level} points={b.points} fill={fillFor(b.level, highlighted, secondaryHighlighted)} />
      ))}
      {bands.map((b) => (
        <SvgLabel key={`${b.level}-label`} x={W / 2} y={b.labelY} textAnchor="middle" fontSize={6} fill={textColorFor(b.level, highlighted)}>
          {LEVEL_LABEL[b.level]}
        </SvgLabel>
      ))}
      <Rect x={0} y={systemsTop} width={W} height={SYSTEMS_H} rx={3} fill={fillFor("systems", highlighted, secondaryHighlighted)} />
      <SvgLabel
        x={W / 2}
        y={systemsTop + SYSTEMS_H / 2 + 2}
        textAnchor="middle"
        fontSize={6}
        fill={textColorFor("systems", highlighted)}
      >
        {LEVEL_LABEL.systems}
      </SvgLabel>
    </Svg>
  );
}
