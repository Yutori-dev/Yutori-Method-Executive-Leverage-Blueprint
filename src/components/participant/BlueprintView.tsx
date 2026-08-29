import { Card } from "@/components/ui/Card";
import { ZoneMatrix } from "@/components/participant/ZoneMatrix";
import type { BlueprintData } from "@/lib/data/blueprint";

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

const CHARACTER_DIMENSIONS = [
  "Stress Tolerance",
  "Dependability",
  "Cooperation",
  "Openness",
  "Sociability",
  "Cognition",
];

export function BlueprintView({
  data,
  participantName,
}: {
  data: BlueprintData;
  participantName: string;
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-serif text-sm italic text-(--color-ink-muted)">
          Yutori Method™ Executive Leverage Blueprint
        </p>
        <h1 className="mt-2 font-serif text-3xl">{participantName}</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {data.session.name}
          {data.session.organization ? ` · ${data.session.organization}` : ""}
        </p>
      </div>

      <section>
        <h2 className="font-serif text-xl">Character</h2>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Unlocked in the live workshop.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CHARACTER_DIMENSIONS.map((dim) => (
            <div
              key={dim}
              className="rounded-lg border border-(--color-hairline) px-3 py-2 text-center text-xs text-(--color-locked)"
            >
              {dim}
            </div>
          ))}
        </div>
      </section>

      {data.operatingAltitude.length > 0 ? (
        <section>
          <h2 className="font-serif text-xl">Operating Altitude</h2>
          <Card className="mt-3">
            <dl className="space-y-3">
              {data.operatingAltitude.map((a) => (
                <div key={a.prompt}>
                  <dt className="text-xs text-(--color-ink-muted)">{a.prompt}</dt>
                  <dd className="mt-0.5 text-sm text-(--color-ink)">{a.answer}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>
      ) : null}

      {data.zone.selected.length > 0 ? (
        <section>
          <h2 className="font-serif text-xl">Current Structure</h2>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Being outside your Zone of Investment does not mean something must be delegated -- it
            identifies a candidate worth examining further.
          </p>
          <Card className="mt-3">
            <ZoneMatrix cells={data.zone.zoneCells} responsibilities={data.zone.selected} />
          </Card>
        </section>
      ) : null}

      {data.delegation.readinessResult || data.delegation.priorityOpportunities.length > 0 ? (
        <section>
          <h2 className="font-serif text-xl">Delegation</h2>
          {data.delegation.readinessResult ? (
            <Card className="mt-3">
              <p className="text-sm text-(--color-ink)">
                {data.delegation.readinessResult.overallResult ?? "Delegation Readiness result pending"}
              </p>
              <p className="mt-2 text-sm text-(--color-ink-muted)">
                {data.delegation.readinessResult.interpretation}
              </p>
            </Card>
          ) : null}
          {data.delegation.priorityOpportunities.length > 0 ? (
            <Card className="mt-3">
              <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
                Priority Delegation Opportunities
              </p>
              <ol className="mt-2 space-y-1.5">
                {data.delegation.priorityOpportunities
                  .sort((a, b) => a.selectionOrder - b.selectionOrder)
                  .map((o) => (
                    <li key={o.selectionOrder} className="flex items-center justify-between text-sm">
                      <span className="text-(--color-ink)">
                        {o.selectionOrder}. {o.label}
                      </span>
                      {o.leverageLevel ? (
                        <span className="text-(--color-ink-muted)">{LEVEL_LABEL[o.leverageLevel]}</span>
                      ) : null}
                    </li>
                  ))}
              </ol>
            </Card>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-xl">Executive Support Architecture</h2>
        <Card className="mt-3">
          {data.architecture.revealed && data.architecture.recommendation ? (
            <>
              <p className="text-sm text-(--color-ink)">
                {data.architecture.recommendation.primaryResult ?? "Mixed leverage profile"}
              </p>
              <p className="mt-2 text-sm text-(--color-ink-muted)">
                {data.architecture.recommendation.rationale}
              </p>
            </>
          ) : (
            <p className="text-sm text-(--color-ink-muted)">
              Awaiting facilitator reveal.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
