import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { DiscussBlueprintButton } from "@/components/participant/DiscussBlueprintButton";
import { HemisphereIcon } from "@/components/participant/HemisphereIcon";
import { WhiteWhaleIcon } from "@/components/participant/WhiteWhaleIcon";
import { DelegationBeliefBars } from "@/components/participant/DelegationBeliefBars";
import { formatCurrentSupport } from "@/lib/currentSupportLabels";
import { actionCopy, withLevel } from "@/lib/executiveSupportArchitectureCopy";
import { ArchitecturePyramid } from "@/components/participant/ArchitecturePyramid";
import {
  LEVEL_TAGLINE,
  LEVEL_ROLES,
  ACTION_SHORT_LABEL,
  summaryLevelDisplay,
  LEADERSHIP_WIRING_EYEBROW,
  DELEGATION_BELIEFS_EYEBROW,
  CHARACTER_FIT_CARDS,
  CHARACTER_FIT_MARKER,
  WHITE_WHALE_SUPPORTING_COPY,
  BLUEPRINT_FOOTER_PRIMARY,
  BLUEPRINT_FOOTER_SECONDARY,
  SECTION_SUBTITLE,
} from "@/lib/blueprintCopy";
import type { BlueprintData } from "@/lib/data/blueprint";
import type { ArchitectureRecommendationView } from "@/lib/data/architecture";
import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";
import type { LeverageLevel } from "@/types/database";

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

/**
 * Numbered-badge + label-column band, matching the v5 visual reference's
 * layout: a square number badge and title/subtitle sit to the left, the
 * section's cards fill the rest of the band. `tint` gives section 03 its
 * distinct "visual center of gravity" background per the client spec.
 */
function SectionBand({
  number,
  title,
  subtitle,
  tint,
  striped,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  tint?: "accent" | "competency";
  striped?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl p-6 sm:p-8",
        tint === "accent" && "bg-(--color-accent-soft)",
        tint === "competency" && "bg-(--color-competency-soft)",
        !tint && "border border-(--color-hairline)",
      )}
      style={
        striped
          ? { backgroundImage: "repeating-linear-gradient(135deg, var(--color-hairline) 0 2px, transparent 2px 14px)" }
          : undefined
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-52 lg:shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-(--color-ink) text-sm font-medium text-(--color-paper)">
            {number}
          </span>
          <h2 className="mt-3 font-serif text-xl leading-tight tracking-wide uppercase">{title}</h2>
          <p className="mt-1 text-xs text-(--color-ink-muted)">{subtitle}</p>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </section>
  );
}

export function BlueprintView({
  data,
  participantName,
  participantSessionId,
}: {
  data: BlueprintData;
  participantName: string;
  participantSessionId: string;
}) {
  const sortedOpportunities = [...data.delegation.priorityOpportunities].sort((a, b) => a.selectionOrder - b.selectionOrder);

  return (
    <div className="space-y-6">
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

      {/* 01 -- Your Operating Altitude */}
      {data.executiveLeverageProfile || data.leadershipWiring || data.capacityMap || data.delegationBeliefs ? (
        <SectionBand number="1" title="Your Operating Altitude" subtitle={SECTION_SUBTITLE.operatingAltitude}>
          <div className="grid gap-4 lg:grid-cols-4">
            {data.executiveLeverageProfile ? (
              <Card>
                <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
                  Executive Leverage Profile
                </p>
                <p className="mt-2 text-sm font-medium text-(--color-ink)">{data.executiveLeverageProfile.profileLabel}</p>
                {data.executiveLeverageProfile.profileDescription ? (
                  <p className="mt-1 text-sm text-(--color-ink-muted)">{data.executiveLeverageProfile.profileDescription}</p>
                ) : null}
                {data.executiveLeverageProfile.strongestConstraints.length > 0 ? (
                  <div className="mt-4 space-y-3 border-t border-(--color-hairline) pt-4">
                    <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Strongest Leverage Constraints</p>
                    {data.executiveLeverageProfile.strongestConstraints.map((c) => (
                      <div key={c.label}>
                        <p className="text-sm font-medium text-(--color-ink)">{c.label}</p>
                        <p className="mt-0.5 text-sm text-(--color-ink-muted)">{c.interpretation}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ) : null}

            {data.leadershipWiring ? (
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Leadership Wiring</p>
                  <p className="text-right text-[10px] font-medium tracking-wide text-(--color-success) uppercase">
                    {LEADERSHIP_WIRING_EYEBROW}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <HemisphereIcon wiring={data.leadershipWiring.wiring} size={36} />
                  <p className="text-sm font-medium text-(--color-ink) capitalize">{data.leadershipWiring.wiring}</p>
                </div>
                <p className="mt-2 text-sm text-(--color-ink-muted)">{data.leadershipWiring.shortDescription}</p>
                <div className="mt-4 border-t border-(--color-hairline) pt-4">
                  <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Pattern Insight</p>
                  <p className="mt-1 text-sm text-(--color-ink-muted)">{data.leadershipWiring.patternInsight}</p>
                </div>
              </Card>
            ) : null}

            {data.capacityMap ? (
              <Card>
                <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
                  Leadership Capacity Map
                </p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-(--color-ink)">Zone of Investment</span>
                    <span className="text-(--color-ink-muted)">{data.capacityMap.investmentPct}%</span>
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-(--color-ink)">Zone of Vulnerability</span>
                    <span className="text-(--color-ink-muted)">{data.capacityMap.vulnerabilityPct}%</span>
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-(--color-ink)">Zone of Ambiguity</span>
                    <span className="text-(--color-ink-muted)">{data.capacityMap.ambiguityPct}%</span>
                  </div>
                </div>
                <p className="mt-4 border-t border-(--color-hairline) pt-4 text-sm text-(--color-ink-muted)">
                  {data.capacityMap.patternInsight}
                </p>
              </Card>
            ) : null}

            {data.delegationBeliefs ? (
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Delegation Beliefs</p>
                  <p className="text-right text-[10px] font-medium tracking-wide text-(--color-accent) uppercase">
                    {DELEGATION_BELIEFS_EYEBROW}
                  </p>
                </div>
                <div className="mt-3">
                  <DelegationBeliefBars dimensions={data.delegationBeliefs.dimensions} />
                </div>
                <div className="mt-4 border-t border-(--color-hairline) pt-4">
                  <p className="text-sm font-medium text-(--color-ink)">{data.delegationBeliefs.biggestImpediment.headline}</p>
                  <p className="mt-1 text-sm text-(--color-ink-muted)">{data.delegationBeliefs.biggestImpediment.interpretation}</p>
                </div>
                {data.delegation.priorityOwnershipTransferOpportunity ? (
                  <div className="mt-4 border-t border-(--color-hairline) pt-4">
                    <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
                      Priority Ownership Transfer Opportunity
                    </p>
                    <p className="mt-1 text-sm text-(--color-ink)">{data.delegation.priorityOwnershipTransferOpportunity.label}</p>
                    <p className="mt-1 text-sm text-(--color-ink-muted)">
                      {data.delegation.priorityOwnershipTransferOpportunity.interpretation}
                    </p>
                  </div>
                ) : null}
              </Card>
            ) : null}
          </div>
        </SectionBand>
      ) : null}

      {/* 02 -- The Ownership to Transfer */}
      {sortedOpportunities.length > 0 ? (
        <SectionBand number="2" title="The Ownership to Transfer" subtitle={SECTION_SUBTITLE.ownershipToTransfer}>
          <div className="grid gap-4 sm:grid-cols-3">
            {sortedOpportunities.map((o) => (
              <Card key={o.selectionOrder}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent-soft) text-xs font-medium text-(--color-accent)">
                  {o.selectionOrder}
                </span>
                <p className="mt-2 text-sm font-medium text-(--color-ink)">{o.label}</p>
                {o.blueprintDescription ? (
                  <p className="mt-2 text-sm text-(--color-ink-muted)">{o.blueprintDescription}</p>
                ) : null}
                {o.leverageLevel ? (
                  <p className="mt-3 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
                    {LEVEL_LABEL[o.leverageLevel]}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        </SectionBand>
      ) : null}

      {/* 03 -- Your Office of the CEO */}
      <SectionBand number="3" title="Your Office of the CEO" subtitle={SECTION_SUBTITLE.officeOfTheCeo} tint="competency">
        <Card>
          {data.architecture.revealed && data.architecture.recommendation && data.architectureConfig ? (
            <ArchitectureSummary rec={data.architecture.recommendation} config={data.architectureConfig} />
          ) : (
            <p className="text-sm text-(--color-ink-muted)">Awaiting facilitator reveal.</p>
          )}
        </Card>
      </SectionBand>

      {/* 04 -- What This Makes Possible */}
      {data.reflections.whiteWhale || data.highestValueFocus.items.length > 0 || data.reflections.successVision ? (
        <SectionBand number="4" title="What This Makes Possible" subtitle={SECTION_SUBTITLE.whatThisMakesPossible} tint="accent">
          <div className="grid gap-4 lg:grid-cols-3">
            {data.reflections.whiteWhale ? (
              <Card>
                <div className="flex items-start gap-3">
                  <WhiteWhaleIcon size={28} />
                  <div>
                    <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">White Whale</p>
                    <p className="mt-1 text-sm text-(--color-ink)">{data.reflections.whiteWhale}</p>
                    <p className="mt-2 text-sm text-(--color-ink-muted)">{WHITE_WHALE_SUPPORTING_COPY}</p>
                  </div>
                </div>
              </Card>
            ) : null}

            {data.highestValueFocus.items.length > 0 ? (
              <Card>
                <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
                  Highest Value Focus
                </p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Zone of Investment · {data.highestValueFocus.investmentPct}%
                </p>
                <div className="mt-3 space-y-3">
                  {data.highestValueFocus.items.map((item) => (
                    <div key={item.responsibilityId} className="border-t border-(--color-hairline) pt-3 first:border-t-0 first:pt-0">
                      <p className="text-sm font-medium text-(--color-ink)">{item.label}</p>
                      {item.blueprintDescription ? (
                        <p className="mt-0.5 text-sm text-(--color-ink-muted)">{item.blueprintDescription}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {data.reflections.successVision ? (
              <Card>
                <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Success Vision</p>
                <p className="mt-2 text-sm font-medium text-(--color-ink)">With greater capacity, I will:</p>
                <p className="mt-2 text-sm whitespace-pre-line text-(--color-ink)">{data.reflections.successVision}</p>
                {data.reflections.successVisionFollowup ? (
                  <p className="mt-2 text-sm whitespace-pre-line text-(--color-ink)">{data.reflections.successVisionFollowup}</p>
                ) : null}
              </Card>
            ) : null}
          </div>
        </SectionBand>
      ) : null}

      {/* 05 -- Character Profile & Future Fit */}
      <SectionBand number="5" title="Character Profile & Future Fit" subtitle={SECTION_SUBTITLE.characterFit} striped>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHARACTER_FIT_CARDS.map((c) => (
            <Card key={c.title}>
              <p className="text-xs font-medium tracking-wide text-(--color-accent) uppercase">{c.title}</p>
              <p className="mt-2 text-sm text-(--color-ink-muted)">{c.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{CHARACTER_FIT_MARKER}</p>
      </SectionBand>

      <section className="space-y-6 border-t border-(--color-hairline) pt-6">
        <div>
          <p className="text-sm font-medium tracking-wide text-(--color-ink) uppercase">{BLUEPRINT_FOOTER_PRIMARY}</p>
          <p className="mt-1 text-xs tracking-wide text-(--color-ink-muted) uppercase">{BLUEPRINT_FOOTER_SECONDARY}</p>
        </div>
        <DiscussBlueprintButton
          participantSessionId={participantSessionId}
          alreadyRequested={data.followUpRequested}
        />
      </section>
    </div>
  );
}

/**
 * Recommended Architecture vs Next Move (client spec sections 15-16),
 * confirmed against the v5 visual reference: "Recommended Architecture"
 * carries a short deterministic action label (ACTION_SHORT_LABEL) + the
 * level's role/support family; "Next Move" carries the longer, current-
 * support-aware recommendation-engine copy (actionCopy). These are two
 * genuinely different strings, not the same content shown twice.
 */
function ArchitectureSummary({
  rec,
  config,
}: {
  rec: ArchitectureRecommendationView;
  config: ExecutiveSupportArchitectureConfigInput;
}) {
  const headlineLevel = rec.primaryLeverageNeed ?? rec.leadingLeverageNeed;
  const highlighted = new Set<LeverageLevel>(
    [rec.primaryLeverageNeed, rec.leadingLeverageNeed, ...rec.multiLayerLevels].filter(
      (l): l is LeverageLevel => !!l,
    ),
  );
  const secondaryHighlighted = new Set<LeverageLevel>(rec.secondaryLeverageNeeds);
  const isMultiLayer = rec.signalType === "multi_layer" || (rec.signalType === "audit_only" && !headlineLevel);
  const secondaryLevel = rec.secondaryLeverageNeeds[0] ?? null;
  const secondaryAction = rec.secondaryRecommendedActions[0] ?? null;

  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start">
      <ArchitecturePyramid variant="mini" highlighted={highlighted} secondaryHighlighted={secondaryHighlighted} />

      <div>
        {isMultiLayer ? (
          <>
            <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Primary</p>
            <p className="mt-1 text-sm font-medium text-(--color-ink)">
              {rec.multiLayerLevels.map((l) => LEVEL_LABEL[l]).join(" · ")} Leverage
            </p>
            {rec.leadingLeverageNeed ? (
              <p className="mt-2 text-sm text-(--color-ink-muted)">{withLevel(config.leadingNeedBody, rec.leadingLeverageNeed)}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Primary</p>
            <p className="mt-1 text-sm font-medium text-(--color-ink)">{summaryLevelDisplay(headlineLevel!)}</p>
            <p className="text-sm text-(--color-ink-muted)">{LEVEL_TAGLINE[headlineLevel!]}</p>

            {secondaryLevel ? (
              <div className="mt-3">
                <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Secondary</p>
                <p className="mt-1 text-sm font-medium text-(--color-ink)">{summaryLevelDisplay(secondaryLevel)}</p>
                <p className="text-sm text-(--color-ink-muted)">{LEVEL_TAGLINE[secondaryLevel]}</p>
              </div>
            ) : null}

            <div className="mt-4 border-t border-(--color-hairline) pt-4">
              <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Recommended Architecture</p>
              <p className="mt-2 text-xs tracking-wide text-(--color-ink-muted) uppercase">Primary Leverage Need</p>
              <p className="text-sm font-medium text-(--color-ink)">{LEVEL_LABEL[headlineLevel!]}</p>
              {rec.primaryRecommendedAction ? (
                <p className="mt-1 text-sm text-(--color-ink)">{ACTION_SHORT_LABEL[rec.primaryRecommendedAction] ?? ""}</p>
              ) : null}
              <p className="text-sm text-(--color-ink-muted)">{LEVEL_ROLES[headlineLevel!].join(" · ")}</p>

              {secondaryLevel ? (
                <div className="mt-3 border-t border-(--color-hairline) pt-3">
                  <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Secondary Need</p>
                  <p className="text-sm font-medium text-(--color-ink)">{LEVEL_LABEL[secondaryLevel]}</p>
                  {secondaryAction ? (
                    <p className="mt-1 text-sm text-(--color-ink)">{ACTION_SHORT_LABEL[secondaryAction] ?? ""}</p>
                  ) : null}
                  <p className="text-sm text-(--color-ink-muted)">{LEVEL_ROLES[secondaryLevel].join(" · ")}</p>
                </div>
              ) : null}
            </div>

            {rec.primaryRecommendedAction ? (
              <div className="mt-4 border-t border-(--color-hairline) pt-4">
                <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Next Move</p>
                <p className="mt-1 text-sm text-(--color-ink-muted)">{actionCopy(rec.primaryRecommendedAction, config)}</p>
              </div>
            ) : null}

            {rec.auditCorroboration === "strong" && rec.primaryLeverageNeed ? (
              <p className="mt-4 text-sm text-(--color-ink-muted)">
                {withLevel(config.corroborationStrongBody, rec.primaryLeverageNeed)}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
