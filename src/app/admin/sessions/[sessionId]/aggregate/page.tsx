import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import { CountBarList } from "@/components/admin/CountBarList";
import { cn } from "@/lib/cn";
import type { SessionAggregates } from "@/lib/data/sessionAggregates";

/**
 * Client feedback 2026-09 (live workshop): this page -- not a separate
 * screen -- should carry the color-coded, per-module + per-sub-exercise
 * completion view, with expand/collapse per module as the "filter."
 * Unlock/reveal controls are never repeated here -- those stay solely on
 * the main session control panel.
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
function CompletionBadge({ count, rate }: { count: number; rate: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", TIER_CLASSES[tierFor(rate)])}>
      {count} · {rate}%
    </span>
  );
}

export default async function SessionAggregatePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("name, disabled_module_keys, skip_delegation_beliefs")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();

  const aggregates = await getSessionAggregates([sessionId]);
  const disabledModuleKeys = new Set(session.disabled_module_keys ?? []);
  const rate = (count: number) =>
    aggregates.registeredCount > 0 ? Math.round((count / aggregates.registeredCount) * 1000) / 10 : 0;
  const moduleRow = (key: string) => aggregates.moduleCompletion.find((m) => m.key === key);

  interface SubRow {
    label: string;
    count: number;
    rate: number;
  }
  interface ChartRow {
    title: string;
    rows: SessionAggregates["zoneDistribution"];
    emptyLabel: string;
  }
  interface ResultSection {
    key: string;
    name: string;
    completeCount: number;
    completeRate: number;
    subRows: SubRow[];
    charts: ChartRow[];
    extra?: { label: string; value: number }[];
  }

  const allSections: ResultSection[] = [
    {
      key: "operating_altitude",
      name: "Operating Altitude",
      completeCount: moduleRow("operating_altitude")?.complete ?? 0,
      completeRate: rate(moduleRow("operating_altitude")?.complete ?? 0),
      subRows: [
        { label: "Executive Leverage Diagnostic", count: aggregates.executiveLeverageDiagnostic.completedCount, rate: aggregates.executiveLeverageDiagnostic.completionRate },
        { label: "Leadership Wiring", count: aggregates.leadershipWiringCompletionCount, rate: aggregates.leadershipWiringCompletionRate },
        { label: "White Whale", count: aggregates.whiteWhaleCompletionCount, rate: aggregates.whiteWhaleCompletionRate },
      ],
      charts: [{ title: "Leadership Wiring", rows: aggregates.selfIdentificationDistribution, emptyLabel: "No self-identifications yet." }],
    },
    {
      key: "current_structure",
      name: "Investment",
      completeCount: moduleRow("current_structure")?.complete ?? 0,
      completeRate: rate(moduleRow("current_structure")?.complete ?? 0),
      subRows: [
        { label: "Mapping (10-12 responsibilities rated)", count: aggregates.zoneOfInvestment.mappingCompletionCount, rate: aggregates.zoneOfInvestment.mappingCompletionRate },
        { label: "Zone of Investment Reveal Viewed", count: aggregates.zoneOfInvestment.revealViewedCount, rate: aggregates.zoneOfInvestment.revealViewedRate },
      ],
      charts: [
        { title: "Zone of Investment Distribution", rows: aggregates.zoneDistribution, emptyLabel: "No ratings yet." },
        { title: "Most Selected Responsibilities", rows: aggregates.mostSelectedResponsibilities, emptyLabel: "No selections yet." },
      ],
    },
    {
      key: "delegation",
      name: "Delegation",
      completeCount: moduleRow("delegation")?.complete ?? 0,
      completeRate: rate(moduleRow("delegation")?.complete ?? 0),
      subRows: [
        ...(session.skip_delegation_beliefs
          ? []
          : [{ label: "Delegation Beliefs", count: aggregates.delegationBeliefsCompletionCount, rate: aggregates.delegationBeliefsCompletionRate }]),
        { label: "Priority Delegation Opportunities", count: aggregates.priorityLeverage.confirmedCount, rate: aggregates.priorityLeverage.confirmedRate },
      ],
      charts: [
        { title: "Most Common Priority Opportunities", rows: aggregates.mostCommonPriorityOpportunities, emptyLabel: "No priority opportunities selected yet." },
        { title: "Priority Opportunity Leverage Distribution", rows: aggregates.priorityLeverageDistribution, emptyLabel: "No priority opportunities selected yet." },
        { title: "Pressure Test", rows: aggregates.pressureTestDistribution, emptyLabel: "No pressure test responses yet." },
      ],
      extra: [
        { label: "Cluster at a single level", value: aggregates.priorityLeverage.singleLevelClusterCount },
        { label: "Span multiple levels", value: aggregates.priorityLeverage.multiLevelSpanCount },
      ],
    },
    {
      key: "leverage",
      name: "Leverage",
      completeCount: moduleRow("leverage")?.complete ?? 0,
      completeRate: rate(moduleRow("leverage")?.complete ?? 0),
      subRows: [
        { label: "Executive Support Audit", count: aggregates.executiveSupportAudit.completedCount, rate: aggregates.executiveSupportAudit.completionRate },
      ],
      charts: [
        { title: "Primary Leverage Gap Frequency", rows: aggregates.executiveSupportAudit.primaryFrequency, emptyLabel: "No completed audits yet." },
        { title: "Secondary Leverage Gap Frequency", rows: aggregates.executiveSupportAudit.secondaryFrequency, emptyLabel: "No completed audits yet." },
      ],
      extra: [
        { label: "Tied primary results", value: aggregates.executiveSupportAudit.tiedPrimaryCount },
        { label: "No clear secondary", value: aggregates.executiveSupportAudit.noSecondaryCount },
      ],
    },
    {
      key: "architecture",
      name: "Architecture",
      completeCount: moduleRow("architecture")?.complete ?? 0,
      completeRate: rate(moduleRow("architecture")?.complete ?? 0),
      subRows: [
        { label: "Calculated", count: aggregates.architectureCalculatedCount, rate: aggregates.architectureCalculatedRate },
        { label: "Reaction Submitted", count: aggregates.architectureReactionCount, rate: aggregates.architectureReactionRate },
      ],
      charts: [
        { title: "Primary Recommendation Signal", rows: aggregates.primarySignalDistribution, emptyLabel: "No recommendations calculated yet." },
        { title: "Architecture Reaction", rows: aggregates.reactionDistribution, emptyLabel: "No reactions submitted yet." },
      ],
    },
    {
      key: "success",
      name: "Success",
      completeCount: moduleRow("success")?.complete ?? 0,
      completeRate: rate(moduleRow("success")?.complete ?? 0),
      subRows: [{ label: "Success Vision", count: aggregates.successVisionCompletionCount, rate: aggregates.successVisionCompletionRate }],
      charts: [],
    },
  ];
  const sections = allSections.filter((s) => !disabledModuleKeys.has(s.key));

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to session
        </Link>

        <h1 className="mt-4 font-serif text-3xl">{session.name} — Aggregate results</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {aggregates.registeredCount} registered · {aggregates.fullyCompletedCount} completed every module
        </p>

        <Card className="mt-6">
          <div className="flex flex-wrap items-center gap-4 text-xs text-(--color-ink-muted)">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-(--color-success)" /> 75-100% on track
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8a5a1f]" /> 41-74% in progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8a3324]" /> 0-40% needs attention
            </span>
          </div>
          <p className="mt-2 text-xs text-(--color-ink-muted)">
            Showing enabled modules only. Click a module to filter down to its sub-exercises and charts.
          </p>
        </Card>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <Card key={section.key}>
              <Disclosure
                label={
                  <span className="flex items-center gap-2 normal-case tracking-normal">
                    <span className="font-serif text-lg">{section.name}</span>
                    <CompletionBadge count={section.completeCount} rate={section.completeRate} />
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                        <th className="pb-2 pr-4">Sub-exercise</th>
                        <th className="pb-2">Completed / %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.subRows.map((sub) => (
                        <tr key={sub.label} className="border-b border-(--color-hairline)/60">
                          <td className="py-2 pr-4">{sub.label}</td>
                          <td className="py-2">
                            <CompletionBadge count={sub.count} rate={sub.rate} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {section.charts.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                {section.extra && section.extra.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-(--color-hairline) pt-4 text-sm">
                    {section.extra.map((e) => (
                      <div key={e.label}>
                        <p className="text-(--color-ink)">{e.value}</p>
                        <p className="text-xs text-(--color-ink-muted)">{e.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Disclosure>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
