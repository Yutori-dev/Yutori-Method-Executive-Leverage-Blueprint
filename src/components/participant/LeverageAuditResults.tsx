import { Card } from "@/components/ui/Card";
import type { LeverageAuditAnswers, LeverageAuditConfig, LeverageAuditDerived } from "@/lib/leverageAuditSchema";

/** Participant results (spec section 8/9): grouped by macro category,
 * qualifying responsibilities only, no scores anywhere, responsibility
 * order preserved from the assessment. Same component serves both
 * variants -- config carries the variant-specific section copy. */
export function LeverageAuditResults({
  config,
  derived,
  answers,
}: {
  config: LeverageAuditConfig;
  derived: LeverageAuditDerived;
  answers: LeverageAuditAnswers;
}) {
  if (derived.noCurrentEa) {
    return (
      <Card>
        <p className="text-sm text-(--color-ink)">{config.exitMessage}</p>
      </Card>
    );
  }

  const ownershipLabel = (value: number | undefined) => config.ownershipLevels.find((l) => l.value === value)?.label ?? "";
  const macroName = (id: string | null) => config.macroCategories.find((m) => m.id === id)?.name ?? "";

  // Section A/B: EA01-12 only, grouped by macro category, preserving the
  // assessment's own responsibility order within each group.
  const eaResponsibilities = config.responsibilities.filter((r) => r.type === "EA");
  const sectionAByCategory = new Map<string, typeof eaResponsibilities>();
  const sectionBByCategory = new Map<string, typeof eaResponsibilities>();
  for (const r of eaResponsibilities) {
    const classification = derived.ea[r.id];
    if (!classification) continue;
    const cat = r.macroCategory ?? "";
    if (classification.greaterLeverageOpportunity) {
      sectionAByCategory.set(cat, [...(sectionAByCategory.get(cat) ?? []), r]);
    }
    if (classification.appropriatelySupported) {
      sectionBByCategory.set(cat, [...(sectionBByCategory.get(cat) ?? []), r]);
    }
  }

  const cosResponsibilities = config.responsibilities.filter((r) => r.type === "COS");
  const sectionCItems = cosResponsibilities.filter((r) => derived.cos[r.id]?.highOwnership);

  const hasAnyResults = sectionAByCategory.size > 0 || sectionBByCategory.size > 0 || sectionCItems.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">{config.resultHeading}</h2>
        {!hasAnyResults ? (
          <p className="mt-2 text-sm text-(--color-ink-muted)">Nothing qualified for a snapshot section this time.</p>
        ) : null}
      </Card>

      {sectionAByCategory.size > 0 ? (
        <Card>
          <h3 className="font-serif text-base">{config.sectionA.heading}</h3>
          <p className="mt-1 text-sm text-(--color-ink-muted)">{config.sectionA.intro}</p>
          <div className="mt-4 space-y-4">
            {config.macroCategories
              .filter((m) => sectionAByCategory.has(m.id))
              .map((m) => (
                <div key={m.id}>
                  <h4 className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{m.name}</h4>
                  <ul className="mt-1 space-y-1">
                    {(sectionAByCategory.get(m.id) ?? []).map((r) => (
                      <li key={r.id} className="text-sm text-(--color-ink)">
                        {r.name}
                        <span className="ml-2 text-xs text-(--color-ink-muted)">
                          Current level: {ownershipLabel(answers.responses[r.id]?.current)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      {sectionBByCategory.size > 0 ? (
        <Card>
          <h3 className="font-serif text-base">{config.sectionB.heading}</h3>
          <p className="mt-1 text-sm text-(--color-ink-muted)">{config.sectionB.intro}</p>
          <div className="mt-4 space-y-4">
            {config.macroCategories
              .filter((m) => sectionBByCategory.has(m.id))
              .map((m) => (
                <div key={m.id}>
                  <h4 className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{macroName(m.id)}</h4>
                  <ul className="mt-1 space-y-1">
                    {(sectionBByCategory.get(m.id) ?? []).map((r) => (
                      <li key={r.id} className="text-sm text-(--color-ink)">
                        {r.name}
                        <span className="ml-2 text-xs text-(--color-ink-muted)">
                          Current level: {ownershipLabel(answers.responses[r.id]?.current)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      {sectionCItems.length > 0 ? (
        <Card>
          <h3 className="font-serif text-base">{config.sectionC.heading}</h3>
          <p className="mt-1 text-sm text-(--color-ink-muted)">{config.sectionC.intro}</p>
          <ul className="mt-4 space-y-3">
            {sectionCItems.map((r) => (
              <li key={r.id} className="text-sm text-(--color-ink)">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-(--color-ink-muted)">Current level: {ownershipLabel(answers.responses[r.id]?.current)}</p>
                {answers.responses[r.id]?.desired === 1 ? (
                  <p className="mt-0.5 text-xs text-(--color-ink)">{config.sectionC.reactionPrefix}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-(--color-ink-muted)">{config.sectionC.closing}</p>
        </Card>
      ) : null}
    </div>
  );
}
