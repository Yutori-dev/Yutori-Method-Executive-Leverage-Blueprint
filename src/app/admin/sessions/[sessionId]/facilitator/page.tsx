import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CountBarList } from "@/components/admin/CountBarList";
import { UnlockWhiteWhaleControl } from "@/components/admin/UnlockWhiteWhaleControl";
import { UnlockLeadershipWiringControl } from "@/components/admin/UnlockLeadershipWiringControl";
import { RevealZoneOfInvestmentControl } from "@/components/admin/RevealZoneOfInvestmentControl";
import { RevealPriorityLeverageControl } from "@/components/admin/RevealPriorityLeverageControl";
import { RevealBlueprintControl } from "@/components/admin/RevealBlueprintControl";
import { ReleaseWorkshopFeedbackControl } from "@/components/admin/ReleaseWorkshopFeedbackControl";
import { cn } from "@/lib/cn";
import type { SessionAggregates } from "@/lib/data/sessionAggregates";

/**
 * Facilitator-mode dashboard (client mockup, 2026-09): live completion
 * visibility per module AND per sub-exercise inside it, so a facilitator
 * running a session "isn't blind" to where the room actually is. Client's
 * own words: "we only care about functionality... titles should match the
 * modules" -- this is a functional match to the mockup, not a pixel copy.
 *
 * Sub-exercise rows reuse the exact same aggregate counts already computed
 * in sessionAggregates.ts (no new scoring/tracking logic); "Show Results"
 * toggles reuse the exact same reveal controls already used on the main
 * session control panel (no new reveal mechanism) -- this page is a
 * reorganized, more granular *view* over things that already exist, plus
 * the two completion counts (Delegation Beliefs, Success Vision) and the
 * two Architecture counts that didn't have their own aggregate field yet.
 */

type ColorTier = "green" | "orange" | "red";

function tierFor(rate: number): ColorTier {
  if (rate >= 75) return "green";
  if (rate >= 41) return "orange";
  return "red";
}

const TIER_CLASSES: Record<ColorTier, string> = {
  green: "bg-(--color-success)/15 text-(--color-success)",
  orange: "bg-[#8a5a1f]/15 text-[#8a5a1f]",
  red: "bg-[#8a3324]/15 text-[#8a3324]",
};

function CompletionCell({ count, rate }: { count: number; rate: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", TIER_CLASSES[tierFor(rate)])}>
      {count} · {rate}%
    </span>
  );
}

interface SubExerciseRow {
  label: string;
  count: number;
  rate: number;
  reveal?: ReactNode;
}

interface ModuleSection {
  key: string;
  name: string;
  moduleCompleteCount: number;
  moduleCompleteRate: number;
  subExercises: SubExerciseRow[];
  charts?: { title: string; rows: SessionAggregates["zoneDistribution"]; emptyLabel: string }[];
}

export default async function FacilitatorViewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) notFound();

  const aggregates = await getSessionAggregates([sessionId]);
  const disabledKeys = new Set<string>(session.disabled_module_keys ?? []);
  const registeredCount = aggregates.registeredCount;

  const rate = (count: number) => (registeredCount > 0 ? Math.round((count / registeredCount) * 1000) / 10 : 0);
  const moduleRow = (key: string) => aggregates.moduleCompletion.find((m) => m.key === key);

  const allSections: ModuleSection[] = [
    {
      key: "operating_altitude",
      name: "Operating Altitude",
      moduleCompleteCount: moduleRow("operating_altitude")?.complete ?? 0,
      moduleCompleteRate: rate(moduleRow("operating_altitude")?.complete ?? 0),
      subExercises: [
        {
          label: "Executive Leverage Diagnostic",
          count: aggregates.executiveLeverageDiagnostic.completedCount,
          rate: aggregates.executiveLeverageDiagnostic.completionRate,
        },
        {
          label: "Leadership Wiring",
          count: aggregates.leadershipWiringCompletionCount,
          rate: aggregates.leadershipWiringCompletionRate,
          reveal: <UnlockLeadershipWiringControl sessionId={sessionId} alreadyUnlocked={session.leadership_wiring_unlocked} />,
        },
        {
          label: "White Whale",
          count: aggregates.whiteWhaleCompletionCount,
          rate: aggregates.whiteWhaleCompletionRate,
          reveal: <UnlockWhiteWhaleControl sessionId={sessionId} alreadyUnlocked={session.white_whale_unlocked} />,
        },
      ],
      charts: [{ title: "Leadership Wiring", rows: aggregates.selfIdentificationDistribution, emptyLabel: "No self-identifications yet." }],
    },
    {
      key: "current_structure",
      name: "Investment",
      moduleCompleteCount: moduleRow("current_structure")?.complete ?? 0,
      moduleCompleteRate: rate(moduleRow("current_structure")?.complete ?? 0),
      subExercises: [
        {
          label: "Mapping (10-12 responsibilities rated)",
          count: aggregates.zoneOfInvestment.mappingCompletionCount,
          rate: aggregates.zoneOfInvestment.mappingCompletionRate,
        },
        {
          label: "Zone of Investment Reveal",
          count: aggregates.zoneOfInvestment.revealViewedCount,
          rate: aggregates.zoneOfInvestment.revealViewedRate,
          reveal: <RevealZoneOfInvestmentControl sessionId={sessionId} alreadyRevealed={session.zone_of_investment_revealed} />,
        },
      ],
      charts: [
        { title: "Zone of Investment Distribution", rows: aggregates.zoneDistribution, emptyLabel: "No ratings yet." },
        { title: "Most Selected Responsibilities", rows: aggregates.mostSelectedResponsibilities, emptyLabel: "No selections yet." },
      ],
    },
    {
      key: "delegation",
      name: "Delegation",
      moduleCompleteCount: moduleRow("delegation")?.complete ?? 0,
      moduleCompleteRate: rate(moduleRow("delegation")?.complete ?? 0),
      subExercises: [
        ...(session.skip_delegation_beliefs
          ? []
          : [
              {
                label: "Delegation Beliefs",
                count: aggregates.delegationBeliefsCompletionCount,
                rate: aggregates.delegationBeliefsCompletionRate,
              },
            ]),
        {
          label: "Priority Delegation Opportunities",
          count: aggregates.priorityLeverage.confirmedCount,
          rate: aggregates.priorityLeverage.confirmedRate,
        },
      ],
      charts: [{ title: "Most Common Priority Opportunities", rows: aggregates.mostCommonPriorityOpportunities, emptyLabel: "No priority opportunities selected yet." }],
    },
    {
      key: "leverage",
      name: "Leverage",
      moduleCompleteCount: moduleRow("leverage")?.complete ?? 0,
      moduleCompleteRate: rate(moduleRow("leverage")?.complete ?? 0),
      subExercises: [
        {
          label: "Executive Support Audit",
          count: aggregates.executiveSupportAudit.completedCount,
          rate: aggregates.executiveSupportAudit.completionRate,
        },
        {
          label: "Priority Leverage Reveal",
          count: session.priority_leverage_reveal_unlocked ? registeredCount : 0,
          rate: session.priority_leverage_reveal_unlocked ? 100 : 0,
          reveal: <RevealPriorityLeverageControl sessionId={sessionId} alreadyRevealed={session.priority_leverage_reveal_unlocked} />,
        },
      ],
      charts: [
        { title: "Primary Leverage Gap Frequency", rows: aggregates.executiveSupportAudit.primaryFrequency, emptyLabel: "No completed audits yet." },
      ],
    },
    {
      key: "architecture",
      name: "Architecture",
      moduleCompleteCount: moduleRow("architecture")?.complete ?? 0,
      moduleCompleteRate: rate(moduleRow("architecture")?.complete ?? 0),
      subExercises: [
        { label: "Calculated", count: aggregates.architectureCalculatedCount, rate: aggregates.architectureCalculatedRate },
        { label: "Reaction Submitted", count: aggregates.architectureReactionCount, rate: aggregates.architectureReactionRate },
      ],
      charts: [{ title: "Primary Recommendation Signal", rows: aggregates.primarySignalDistribution, emptyLabel: "No recommendations calculated yet." }],
    },
    {
      key: "success",
      name: "Success",
      moduleCompleteCount: moduleRow("success")?.complete ?? 0,
      moduleCompleteRate: rate(moduleRow("success")?.complete ?? 0),
      subExercises: [
        { label: "Success Vision", count: aggregates.successVisionCompletionCount, rate: aggregates.successVisionCompletionRate },
      ],
    },
  ];

  const sections = allSections.filter((s) => !disabledKeys.has(s.key));

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to session
        </Link>

        <h1 className="mt-4 font-serif text-3xl">{session.name} — Facilitator view</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {registeredCount} registered · {aggregates.fullyCompletedCount} completed every module
        </p>

        <Card className="mt-6">
          <div className="flex flex-wrap items-center gap-4 text-xs text-(--color-ink-muted)">
            <span className="font-medium text-(--color-ink)">Completion color guide:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", "bg-(--color-success)")} /> 75-100% on track
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8a5a1f]" /> 41-74% in progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8a3324]" /> 0-40% needs attention
            </span>
          </div>
          <p className="mt-2 text-xs text-(--color-ink-muted)">
            Showing enabled modules only for this session. Percentages are based on {registeredCount} registered
            participants.
          </p>
        </Card>

        <div className="mt-6 space-y-6">
          {sections.map((section) => (
            <Card key={section.key}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl">{section.name}</h2>
                <CompletionCell count={section.moduleCompleteCount} rate={section.moduleCompleteRate} />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                      <th className="pb-2 pr-4">Sub-exercise</th>
                      <th className="pb-2 pr-4">Completed / % (of {registeredCount})</th>
                      <th className="pb-2">Show results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.subExercises.map((sub) => (
                      <tr key={sub.label} className="border-b border-(--color-hairline)/60">
                        <td className="py-2 pr-4">{sub.label}</td>
                        <td className="py-2 pr-4">
                          <CompletionCell count={sub.count} rate={sub.rate} />
                        </td>
                        <td className="py-2">{sub.reveal ?? <span className="text-(--color-ink-muted)">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {section.charts && section.charts.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-(--color-hairline) pt-4 sm:grid-cols-2">
                  {section.charts.map((chart) => (
                    <div key={chart.title}>
                      <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{chart.title}</p>
                      <div className="mt-2">
                        <CountBarList rows={chart.rows} emptyLabel={chart.emptyLabel} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}

          <Card>
            <h2 className="font-serif text-xl">Beyond individual modules</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              These reveals apply after the modules above are done, not to any single one.
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3 border-t border-(--color-hairline) pt-4">
                <p className="text-sm text-(--color-ink)">Blueprint reveal</p>
                <RevealBlueprintControl sessionId={sessionId} alreadyRevealed={session.blueprint_revealed} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-(--color-hairline) pt-4">
                <p className="text-sm text-(--color-ink)">Final workshop feedback</p>
                <ReleaseWorkshopFeedbackControl sessionId={sessionId} alreadyReleased={session.workshop_feedback_released} />
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
