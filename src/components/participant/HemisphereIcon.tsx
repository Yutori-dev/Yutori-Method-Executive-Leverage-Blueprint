import { getHemisphereState } from "@/lib/blueprintCopy";
import type { SelfIdentification } from "@/types/database";

/**
 * Split-brain icon for Leadership Wiring (client spec section 6): Visionary
 * illuminates the right hemisphere, Integrator the left, Hybrid both. The
 * inactive half stays visible but subdued -- never hidden -- so the shape
 * always reads as one whole brain. getHemisphereState is the single shared
 * source of truth for which half lights up; HemisphereIconPdf mirrors this
 * geometry for the PDF export using react-pdf's Svg/Path primitives, since
 * DOM <svg> and react-pdf's Svg are different element types and can't share
 * one component.
 */
export function HemisphereIcon({ wiring, size = 40 }: { wiring: SelfIdentification; size?: number }) {
  const { leftActive, rightActive } = getHemisphereState(wiring);

  return (
    <svg width={size} height={(size * 36) / 40} viewBox="0 0 40 36" fill="none" aria-hidden="true">
      <path
        d="M20 2 C10 2 4 8 4 16 C4 24 8 30 14 32 C17 33.5 19 33.5 20 32 Z"
        fill={leftActive ? "var(--color-accent)" : "var(--color-hairline)"}
      />
      <path
        d="M20 2 C30 2 36 8 36 16 C36 24 32 30 26 32 C23 33.5 21 33.5 20 32 Z"
        fill={rightActive ? "var(--color-accent)" : "var(--color-hairline)"}
      />
      <path d="M20 2 L20 32" stroke="var(--color-paper-raised)" strokeWidth="1.5" />
    </svg>
  );
}
