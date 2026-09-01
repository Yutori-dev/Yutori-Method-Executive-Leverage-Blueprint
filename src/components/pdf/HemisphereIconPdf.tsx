import { Svg, Path } from "@react-pdf/renderer";
import { getHemisphereState } from "@/lib/blueprintCopy";
import type { SelfIdentification } from "@/types/database";

const ACTIVE = "#6b5a3e";
const INACTIVE = "#e4e1da";
const DIVIDER = "#ffffff";

/** PDF sibling of HemisphereIcon.tsx -- same geometry, same
 * getHemisphereState logic, react-pdf's Svg/Path primitives instead of a
 * DOM <svg>. */
export function HemisphereIconPdf({ wiring, size = 32 }: { wiring: SelfIdentification; size?: number }) {
  const { leftActive, rightActive } = getHemisphereState(wiring);
  const height = (size * 36) / 40;

  return (
    <Svg width={size} height={height} viewBox="0 0 40 36">
      <Path
        d="M20 2 C10 2 4 8 4 16 C4 24 8 30 14 32 C17 33.5 19 33.5 20 32 Z"
        fill={leftActive ? ACTIVE : INACTIVE}
      />
      <Path
        d="M20 2 C30 2 36 8 36 16 C36 24 32 30 26 32 C23 33.5 21 33.5 20 32 Z"
        fill={rightActive ? ACTIVE : INACTIVE}
      />
      <Path d="M20 2 L20 32" stroke={DIVIDER} strokeWidth={1.5} />
    </Svg>
  );
}
