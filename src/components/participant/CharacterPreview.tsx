const CHARACTER_DIMENSIONS = [
  "Stress Tolerance",
  "Dependability",
  "Cooperation",
  "Openness",
  "Sociability",
  "Cognition",
];

const LEADERSHIP_WIRING_LABEL: Record<string, string> = {
  visionary: "Visionary",
  integrator: "Integrator",
  hybrid: "Hybrid",
};

/** Brief section 1B/12: the six detailed Character dimensions stay locked
 * until the live workshop, but remain visible -- shown as an "intentional,
 * premium" locked state, not a disabled/error look (brief section 1B).
 *
 * Leadership Wiring is the first populated field within Character (client
 * Implementation Specification) -- when provided, it renders as a filled-in,
 * non-locked first tile alongside the six still-locked dimensions. */
export function CharacterPreview({ leadershipWiring }: { leadershipWiring?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {leadershipWiring ? (
        <div className="rounded-lg border border-(--color-accent) bg-(--color-accent-soft) px-3 py-2 text-center text-xs text-(--color-ink)">
          <p className="text-[10px] tracking-wide text-(--color-ink-muted) uppercase">Leadership Wiring</p>
          <p className="mt-0.5">{LEADERSHIP_WIRING_LABEL[leadershipWiring] ?? leadershipWiring}</p>
        </div>
      ) : null}
      {CHARACTER_DIMENSIONS.map((dim) => (
        <div
          key={dim}
          className="rounded-lg border border-(--color-hairline) px-3 py-2 text-center text-xs text-(--color-locked)"
        >
          {dim}
        </div>
      ))}
    </div>
  );
}
