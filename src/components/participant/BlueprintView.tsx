import { Card } from "@/components/ui/Card";
import { ZoneMatrix } from "@/components/participant/ZoneMatrix";
import { CharacterPreview } from "@/components/participant/CharacterPreview";
import { DiscussBlueprintButton } from "@/components/participant/DiscussBlueprintButton";
import { formatCurrentSupport } from "@/lib/currentSupportLabels";
import type { BlueprintData } from "@/lib/data/blueprint";

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

export function BlueprintView({
  data,
  participantName,
  participantSessionId,
}: {
  data: BlueprintData;
  participantName: string;
  participantSessionId: string;
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
        {data.participant.companyName || data.participant.currentRoleTitle ? (
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            {[data.participant.currentRoleTitle, data.participant.companyName].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          Current executive support: {formatCurrentSupport(data.participant.currentSupport)}
        </p>
      </div>

      <section>
        <h2 className="font-serif text-xl">Character</h2>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Unlocked in the live workshop.
        </p>
        <div className="mt-3">
          <CharacterPreview leadershipWiring={data.selfIdentification} />
        </div>
      </section>

      {data.executiveLeverageProfile ? (
        <section>
          <h2 className="font-serif text-xl">Executive Leverage Profile</h2>
          <Card className="mt-3">
            <p className="text-sm text-(--color-ink)">{data.executiveLeverageProfile.profileLabel}</p>
            {data.executiveLeverageProfile.profileDescription ? (
              <p className="mt-2 text-sm text-(--color-ink-muted)">
                {data.executiveLeverageProfile.profileDescription}
              </p>
            ) : null}
            {data.executiveLeverageProfile.strongestConstraints.length > 0 ? (
              <div className="mt-4 space-y-3 border-t border-(--color-hairline) pt-4">
                <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
                  Strongest Leverage Constraints
                </p>
                {data.executiveLeverageProfile.strongestConstraints.map((c) => (
                  <div key={c.label}>
                    <p className="text-sm font-medium text-(--color-ink)">{c.label}</p>
                    <p className="mt-0.5 text-sm text-(--color-ink-muted)">{c.interpretation}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </section>
      ) : null}

      {data.zone.personalizedPlacements.length > 0 ? (
        <section>
          <h2 className="font-serif text-xl">Current Structure</h2>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Being outside your Zone of Investment does not mean something must be delegated -- it
            identifies a candidate worth examining further.
          </p>
          <Card className="mt-3">
            <ZoneMatrix cells={data.zone.zoneCells} placements={data.zone.personalizedPlacements} />
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

      {data.reflections.successVision || data.reflections.whiteWhale ? (
        <section>
          <h2 className="font-serif text-xl">What This Could Unlock</h2>
          <p className="mt-1 text-xs text-(--color-ink-muted)">
            Private to you and your facilitator.
          </p>
          <Card className="mt-3 space-y-4">
            {data.reflections.whiteWhale ? (
              <div>
                <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Your White Whale</p>
                <p className="mt-1 text-sm text-(--color-ink)">{data.reflections.whiteWhale}</p>
              </div>
            ) : null}
            {data.reflections.successVision ? (
              <p className="text-sm text-(--color-ink)">{data.reflections.successVision}</p>
            ) : null}
            {data.reflections.successVisionFollowup ? (
              <p className="text-sm text-(--color-ink-muted)">{data.reflections.successVisionFollowup}</p>
            ) : null}
          </Card>
        </section>
      ) : null}

      <section className="border-t border-(--color-hairline) pt-6">
        <DiscussBlueprintButton
          participantSessionId={participantSessionId}
          alreadyRequested={data.followUpRequested}
        />
      </section>
    </div>
  );
}
