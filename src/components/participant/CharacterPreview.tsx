const CHARACTER_DIMENSIONS = [
  "Stress Tolerance",
  "Dependability",
  "Cooperation",
  "Openness",
  "Sociability",
  "Cognition",
];

/** Brief section 1B/12: the six detailed Character dimensions stay locked
 * until the live workshop, but remain visible -- shown as an "intentional,
 * premium" locked state, not a disabled/error look (brief section 1B). */
export function CharacterPreview() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
