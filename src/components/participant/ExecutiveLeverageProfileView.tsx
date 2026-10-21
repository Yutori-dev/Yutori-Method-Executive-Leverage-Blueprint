import { cn } from "@/lib/cn";
import {
  CONSTRAINT_LEVEL_LABEL,
  CONSTRAINT_LEVEL_ORDER,
  type ConstraintCard,
  type ConstraintLevel,
} from "@/lib/leverageProfileCards";
import type { ExecutiveLeverageProfileResult } from "@/lib/data/executiveLeverageDiagnostic";

/** Restrained severity colours. Severity is also spelled out by the visible
 * group heading, so colour is never the only signal. */
const LEVEL_STYLE: Record<ConstraintLevel, { accent: string; tint: string }> = {
  very_high: { accent: "#a3392b", tint: "#f8e9e5" },
  high: { accent: "#c0661c", tint: "#fbeee0" },
  moderate: { accent: "#b08a1f", tint: "#f8f1da" },
};

/** Overall result colour: green = high, orange = constrained, red = insufficient.
 * The label itself is always shown in words as well. */
const PROFILE_STYLE: Record<string, { accent: string; tint: string }> = {
  "HIGH LEVERAGE": { accent: "#2f7d4f", tint: "#e7f3ec" },
  "CONSTRAINED LEVERAGE": { accent: "#c0661c", tint: "#fbeee0" },
  "INSUFFICIENT LEVERAGE": { accent: "#a3392b", tint: "#f8e9e5" },
};

/** Two columns on wide screens, one on mobile. The whole-person capacity card
 * (question 1) spans both columns at the start of its group, and a final
 * unpaired card spans both so no row is left half empty. */
function columnSpans(cards: ConstraintCard[]): boolean[] {
  const spans = cards.map((c) => c.number === 1);
  const rest = cards.map((c, i) => (spans[i] ? -1 : i)).filter((i) => i !== -1);
  if (rest.length % 2 === 1) spans[rest[rest.length - 1]] = true;
  return spans;
}

/**
 * "Your Executive Leverage Profile": the existing overall result and
 * strongest-constraints summary on a softly tinted panel, then every response
 * in the moderate / high / very high range as a short card (fixed title +
 * the participant's exact answer), grouped Very high -> High -> Moderate.
 * Pure presentation of already-saved data, so the same view serves the
 * in-flow result, the saved page on return, and the dashboard artifact.
 */
export function ExecutiveLeverageProfileView({ result }: { result: ExecutiveLeverageProfileResult }) {
  const groups = CONSTRAINT_LEVEL_ORDER.map((level) => ({
    level,
    cards: result.cards.filter((c) => c.level === level),
  })).filter((g) => g.cards.length > 0);

  const profileStyle = PROFILE_STYLE[result.profileLabel.trim().toUpperCase()] ?? null;

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-3xl">Your Executive Leverage Profile</h2>

      <section
        className="rounded-2xl border border-(--color-hairline) bg-(--color-accent-soft) p-6 sm:p-8"
        style={profileStyle ? { backgroundColor: profileStyle.tint, borderColor: profileStyle.accent } : undefined}
      >
        <p
          className="flex items-center gap-2.5 font-serif text-xl tracking-wide text-(--color-ink) uppercase"
          style={profileStyle ? { color: profileStyle.accent } : undefined}
        >
          {profileStyle ? <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: profileStyle.accent }} /> : null}
          {result.profileLabel}
        </p>
        {result.profileDescription ? (
          <p className="mt-3 text-sm text-(--color-ink)">{result.profileDescription}</p>
        ) : null}
        {result.strongestConstraints.length > 0 ? (
          <div className="mt-6 space-y-4 border-t border-(--color-hairline) pt-5">
            <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Strongest Leverage Constraints</p>
            {result.strongestConstraints.map((c) => (
              <div key={c.label}>
                <p className="text-sm font-semibold text-(--color-ink)">{c.label}</p>
                <p className="mt-1 text-sm text-(--color-ink-muted)">{c.interpretation}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="font-serif text-2xl">Leverage constraints</h3>
        {groups.length === 0 ? (
          <p className="mt-4 text-sm font-medium text-(--color-ink)">
            None of your responses fall in the moderate, high or very high constraint range.
          </p>
        ) : (
          <div className="mt-5 space-y-8">
            {groups.map(({ level, cards }) => {
              const style = LEVEL_STYLE[level];
              const spans = columnSpans(cards);
              return (
                <div key={level}>
                  <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-(--color-ink) uppercase">
                    <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.accent }} />
                    {CONSTRAINT_LEVEL_LABEL[level]}
                  </h4>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {cards.map((card, i) => (
                      <div
                        key={card.number}
                        className={cn("rounded-xl border border-(--color-hairline) border-l-4 bg-white p-4", spans[i] && "md:col-span-2")}
                        style={{ borderLeftColor: style.accent }}
                      >
                        <p className="text-sm font-semibold text-(--color-ink)">{card.title}</p>
                        <p
                          className="mt-2 rounded-lg px-3 py-2 text-sm wrap-break-word text-(--color-ink)"
                          style={{ backgroundColor: style.tint }}
                        >
                          {card.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-(--color-ink-muted)">Only moderate, high and very high constraints are shown.</p>
          </div>
        )}
      </section>
    </div>
  );
}
