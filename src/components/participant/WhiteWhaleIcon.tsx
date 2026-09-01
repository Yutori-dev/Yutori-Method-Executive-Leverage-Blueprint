/**
 * White Whale's own icon (client spec section 19: "do not reuse the
 * Strategic Leverage icon"). Simple decorative whale silhouette, distinct
 * from any leverage-level iconography used elsewhere in the Blueprint.
 */
export function WhiteWhaleIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M4 18c0-6 5-11 12-11 6 0 10 3 12 7-1 4-5 8-11 8-3 0-5-1-7-2-2 3-5 4-8 3 1-2 2-3 2-5z"
        fill="var(--color-accent-soft)"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="14" r="1" fill="var(--color-accent)" />
    </svg>
  );
}
