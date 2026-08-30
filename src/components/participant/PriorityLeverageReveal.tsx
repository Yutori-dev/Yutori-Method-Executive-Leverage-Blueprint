import { Card } from "@/components/ui/Card";
import type { PriorityLeverageRevealData } from "@/lib/data/priorityLeverageReveal";
import type { LeverageLevel } from "@/types/database";

const LEVEL_LABEL: Record<LeverageLevel, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

/** The second phase of the "leverage" module -- combines already-confirmed
 * Priority Delegation Opportunities (with their hidden leverage level) and
 * the already-calculated Executive Support Audit results for reference.
 * Purely presentational: no scoring happens here, see
 * src/lib/data/priorityLeverageReveal.ts. */
export function PriorityLeverageReveal({ data }: { data: PriorityLeverageRevealData }) {
  if (!data.revealed) {
    return (
      <Card>
        <p className="font-serif text-xl text-(--color-ink)">Your Priority Leverage Opportunities are ready.</p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          Your facilitator will reveal them to the group during the session.
        </p>
      </Card>
    );
  }

  const { config, opportunities, leveragePattern, auditPrimaryLayers, auditSecondaryLayers, auditCalculated } = data;
  const isPrimaryTied = auditPrimaryLayers.length > 1;

  return (
    <div className="space-y-6">
      <Card>
        <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
          {config.revealHeader}
        </p>
        <p className="mt-4 text-sm text-(--color-ink-muted)">{config.revealIntro}</p>

        {opportunities.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {opportunities.map((o) => (
              <li key={o.responsibilityId} className="flex items-center justify-between text-sm">
                <span className="text-(--color-ink)">{o.label}</span>
                <span className="text-(--color-ink-muted)">
                  {o.leverageLevel ? LEVEL_LABEL[o.leverageLevel] : "Pending classification"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-(--color-ink-muted)">
            You did not confirm any Priority Delegation Opportunities.
          </p>
        )}
      </Card>

      {leveragePattern.length > 0 ? (
        <Card>
          <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">{config.leveragePatternHeader}</p>
          <p className="mt-3 text-sm text-(--color-ink)">
            {leveragePattern.map((p) => `${p.count} ${LEVEL_LABEL[p.level]}`).join(" · ")}
          </p>
        </Card>
      ) : null}

      {auditCalculated ? (
        <Card>
          <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">{config.auditContextHeader}</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-(--color-ink-muted)">
                {isPrimaryTied ? "Primary Leverage Gaps" : "Primary Leverage Gap"}
              </p>
              <p className="mt-0.5 text-sm text-(--color-ink)">
                {auditPrimaryLayers.map((l) => LEVEL_LABEL[l]).join(" · ")}
              </p>
            </div>
            {!isPrimaryTied ? (
              <div>
                <p className="text-xs text-(--color-ink-muted)">
                  {auditSecondaryLayers.length > 1 ? "Secondary Leverage Gaps" : "Secondary Leverage Gap"}
                </p>
                <p className="mt-0.5 text-sm text-(--color-ink)">
                  {auditSecondaryLayers.length > 0
                    ? auditSecondaryLayers.map((l) => LEVEL_LABEL[l]).join(" · ")
                    : config.noSecondaryGapLabel}
                </p>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <p className="text-sm font-medium text-(--color-ink)">{config.interpretationHeadline}</p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">{config.interpretationBody}</p>
      </Card>
    </div>
  );
}
