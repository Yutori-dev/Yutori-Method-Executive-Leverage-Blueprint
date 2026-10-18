import { Card } from "@/components/ui/Card";
import type { EaBufferConfig, EaBufferDerived } from "@/lib/eaBufferSchema";

/**
 * "Your EA Buffer Snapshot" (spec section 8). Five bars in the fixed function
 * order on a 0-4 scale, the classification label per bar, then three sections
 * of the approved interpretation text -- one separate entry per function,
 * never combined, never with a numeric score. Participants see no numbers.
 */
export function EaBufferResults({ config, derived }: { config: EaBufferConfig; derived: EaBufferDerived }) {
  if (derived.noCurrentEa) {
    return (
      <Card>
        <p className="text-sm text-(--color-ink)">{config.exitMessage}</p>
      </Card>
    );
  }

  const byId = new Map(derived.functions.map((f) => [f.id, f]));
  const interpretation = (id: string) => {
    const f = byId.get(id);
    return f ? (config.results.interpretations[id]?.[f.classification] ?? "") : "";
  };
  const labelFor = (id: string) => {
    const f = byId.get(id);
    return f ? config.classificationLabels[f.classification] : "";
  };

  const sections: { heading: string; ids: string[]; framing?: string }[] = [
    { heading: config.results.headings.strongest, ids: derived.strongestIds },
    { heading: config.results.headings.needs, ids: derived.needsIds },
    {
      heading: config.results.headings.opportunity,
      ids: derived.opportunityIds,
      framing: derived.allStrong ? config.results.allStrongFraming : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-2xl">{config.results.title}</h2>
        <p className="mt-2 text-sm font-medium text-(--color-ink)">{config.results.subtitle}</p>
        <p className="mt-3 text-sm text-(--color-ink-muted)">{config.results.intro}</p>

        <ul className="mt-6 space-y-4">
          {config.functions.map((fn) => {
            const f = byId.get(fn.id);
            const width = f ? Math.max(0, Math.min(100, (f.average / 4) * 100)) : 0;
            return (
              <li key={fn.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-(--color-ink)">{fn.name}</span>
                  <span className="text-xs text-(--color-ink-muted)">{labelFor(fn.id)}</span>
                </div>
                <div
                  className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-(--color-accent-soft)"
                  role="img"
                  aria-label={`${fn.name}: ${labelFor(fn.id)}`}
                >
                  <div className="h-full rounded-full bg-(--color-accent)" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {sections.map((section) => (
        <Card key={section.heading}>
          <h3 className="font-serif text-lg">{section.heading}</h3>
          {section.framing ? <p className="mt-2 text-sm text-(--color-ink)">{section.framing}</p> : null}
          <ul className="mt-3 space-y-3">
            {section.ids.map((id) => (
              <li key={id} className="text-sm text-(--color-ink)">
                {interpretation(id)}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
