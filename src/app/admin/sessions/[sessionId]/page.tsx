import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ModuleStateBadge } from "@/components/ui/ModuleStateBadge";
import { Disclosure } from "@/components/ui/Disclosure";
import { SessionStatusSelect } from "@/components/admin/SessionStatusSelect";
import { UnlockModuleControl } from "@/components/admin/UnlockModuleControl";
import { RevealPriorityLeverageControl } from "@/components/admin/RevealPriorityLeverageControl";
import { RevealZoneOfInvestmentControl } from "@/components/admin/RevealZoneOfInvestmentControl";
import { UnlockWhiteWhaleControl } from "@/components/admin/UnlockWhiteWhaleControl";
import { UnlockLeadershipWiringControl } from "@/components/admin/UnlockLeadershipWiringControl";
import { ReleaseWorkshopFeedbackControl } from "@/components/admin/ReleaseWorkshopFeedbackControl";
import { RevealBlueprintControl } from "@/components/admin/RevealBlueprintControl";
import { LiveRosterRefresher } from "@/components/admin/LiveRosterRefresher";
import { CountBarList } from "@/components/admin/CountBarList";
import { cn } from "@/lib/cn";
import type { ModuleDisplayState } from "@/lib/moduleState";
import type { SessionStatus } from "@/types/database";
import type { SessionAggregates } from "@/lib/data/sessionAggregates";

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

export default async function SessionControlPanelPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: session }, { data: modules }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
    supabase.from("modules").select("*").eq("active", true).order("sort_order", { ascending: true }),
  ]);

  if (!session || !modules) notFound();

  const aggregates = await getSessionAggregates([sessionId]);

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id, participant_id, current_module_id, completion_state, last_active_at")
    .eq("session_id", sessionId)
    .order("last_active_at", { ascending: false });

  const participantIds = [...new Set((enrollments ?? []).map((e) => e.participant_id))];
  const participantSessionIds = (enrollments ?? []).map((e) => e.id);

  const [{ data: participants }, { data: recommendations }, { data: followUps }] = await Promise.all([
    participantIds.length > 0
      ? supabase.from("participants").select("id, first_name, last_name, email, company_name").in("id", participantIds)
      : Promise.resolve({ data: [] }),
    participantSessionIds.length > 0
      ? supabase.from("architecture_recommendations").select("participant_session_id").in("participant_session_id", participantSessionIds)
      : Promise.resolve({ data: [] }),
    participantSessionIds.length > 0
      ? supabase.from("follow_up_interests").select("participant_session_id").in("participant_session_id", participantSessionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const participantById = new Map((participants ?? []).map((p) => [p.id, p]));
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const blueprintReadyIds = new Set((recommendations ?? []).map((r) => r.participant_session_id));
  const discussRequestedIds = new Set((followUps ?? []).map((f) => f.participant_session_id));

  const roster = (enrollments ?? []).map((enrollment) => ({
    ...enrollment,
    participant: participantById.get(enrollment.participant_id) ?? null,
    currentModuleName: enrollment.current_module_id
      ? (moduleById.get(enrollment.current_module_id)?.name ?? null)
      : null,
    blueprintReady: blueprintReadyIds.has(enrollment.id),
    discussRequested: discussRequestedIds.has(enrollment.id),
  }));

  const disabledModuleKeys = new Set<string>(session.disabled_module_keys ?? []);
  const activeModule = modules.find((m) => m.id === session.active_module_id);
  const nextModule = modules
    .filter((m) => !m.requires_live_workshop && !disabledModuleKeys.has(m.key))
    .find((m) => !activeModule || m.sort_order > activeModule.sort_order);
  const architectureModule = modules.find((m) => m.key === "architecture");
  const architectureUnlocked = Boolean(
    architectureModule && activeModule && architectureModule.sort_order <= activeModule.sort_order,
  );
  const currentStructureModule = modules.find((m) => m.key === "current_structure");
  const currentStructureUnlocked = Boolean(
    currentStructureModule &&
      activeModule &&
      currentStructureModule.sort_order <= activeModule.sort_order &&
      !disabledModuleKeys.has("current_structure"),
  );
  const operatingAltitudeModule = modules.find((m) => m.key === "operating_altitude");
  const operatingAltitudeUnlocked = Boolean(
    operatingAltitudeModule &&
      activeModule &&
      operatingAltitudeModule.sort_order <= activeModule.sort_order &&
      !disabledModuleKeys.has("operating_altitude"),
  );
  const leverageModule = modules.find((m) => m.key === "leverage");
  const leverageUnlocked = Boolean(
    leverageModule &&
      activeModule &&
      leverageModule.sort_order <= activeModule.sort_order &&
      !disabledModuleKeys.has("leverage"),
  );

  // Results breakdown per module and per sub-exercise inside it -- lives
  // on this same page (client feedback 2026-09: unlocks and results in
  // one screen, not split across two). Reveal toggles aren't repeated
  // here -- the exact same controls already sit in "Module control"
  // above; this section is read-only completion visibility + charts.
  const rate = (count: number) =>
    aggregates.registeredCount > 0 ? Math.round((count / aggregates.registeredCount) * 1000) / 10 : 0;
  const moduleRow = (key: string) => aggregates.moduleCompletion.find((m) => m.key === key);
  interface SubRow {
    label: string;
    count: number;
    rate: number;
  }
  interface ResultSection {
    key: string;
    name: string;
    completeCount: number;
    completeRate: number;
    subRows: SubRow[];
    charts: { title: string; rows: SessionAggregates["zoneDistribution"]; emptyLabel: string }[];
  }
  const allResultSections: ResultSection[] = [
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
      charts: [{ title: "Most Common Priority Opportunities", rows: aggregates.mostCommonPriorityOpportunities, emptyLabel: "No priority opportunities selected yet." }],
    },
    {
      key: "leverage",
      name: "Leverage",
      completeCount: moduleRow("leverage")?.complete ?? 0,
      completeRate: rate(moduleRow("leverage")?.complete ?? 0),
      subRows: [
        { label: "Executive Support Audit", count: aggregates.executiveSupportAudit.completedCount, rate: aggregates.executiveSupportAudit.completionRate },
      ],
      charts: [{ title: "Primary Leverage Gap Frequency", rows: aggregates.executiveSupportAudit.primaryFrequency, emptyLabel: "No completed audits yet." }],
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
      charts: [{ title: "Primary Recommendation Signal", rows: aggregates.primarySignalDistribution, emptyLabel: "No recommendations calculated yet." }],
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
  const resultSections = allResultSections.filter((s) => !disabledModuleKeys.has(s.key));

  const joinUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/join/${session.join_code}`
      : `/join/${session.join_code}`;

  return (
    <main className="py-16">
      <Container>
        <LiveRosterRefresher sessionId={sessionId} />
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl">{session.name}</h1>
            <p className="mt-1 text-sm text-(--color-ink-muted) break-all">
              {session.organization ? `${session.organization} · ` : ""}Join link:{" "}
              <code className="rounded bg-(--color-accent-soft) px-1.5 py-0.5">{joinUrl}</code>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/sessions/${sessionId}/aggregate`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Aggregate results
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/diagnostic`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Executive Leverage Diagnostic
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/zone-of-investment`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Zone of Investment
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/present`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Presentation mode
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/follow-up`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Follow-up queue
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/feedback`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Workshop feedback
            </Link>
            <a
              href={`/admin/sessions/${sessionId}/export`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Export CSV
            </a>
            <Link
              href={`/admin/sessions/${sessionId}/edit`}
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Edit
            </Link>
            <SessionStatusSelect sessionId={sessionId} status={session.status as SessionStatus} />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <h2 className="font-serif text-xl">Module control</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              Unlocking is cohort-wide and moves forward only.
            </p>

            <div className="mt-6 space-y-2">
              {modules.map((module) => {
                const isDisabled = disabledModuleKeys.has(module.key);
                const state: ModuleDisplayState = module.requires_live_workshop
                  ? "LOCKED"
                  : activeModule && module.sort_order <= activeModule.sort_order
                    ? "OPEN"
                    : "LOCKED";
                return (
                  <div
                    key={module.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-4 py-2.5",
                      isDisabled ? "border-(--color-hairline) opacity-60" : "border-(--color-hairline)",
                    )}
                  >
                    <span className="text-sm">{module.name}</span>
                    {isDisabled ? (
                      <span className="rounded-full bg-(--color-locked) px-2.5 py-0.5 text-xs font-medium text-(--color-ink-muted)">
                        Disabled for this session
                      </span>
                    ) : (
                      <ModuleStateBadge state={state} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <UnlockModuleControl sessionId={sessionId} nextModuleName={nextModule?.name ?? null} />
            </div>

            {operatingAltitudeUnlocked || session.white_whale_unlocked ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">White Whale unlock</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Separate from module unlocking -- comes after the Executive Leverage Diagnostic
                  within Operating Altitude.
                </p>
                <div className="mt-3">
                  <UnlockWhiteWhaleControl sessionId={sessionId} alreadyUnlocked={session.white_whale_unlocked} />
                </div>
              </div>
            ) : null}

            {operatingAltitudeUnlocked || session.leadership_wiring_unlocked ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">Leadership Wiring unlock</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  The last of the three Operating Altitude activities -- completing it marks the
                  module complete.
                </p>
                <div className="mt-3">
                  <UnlockLeadershipWiringControl
                    sessionId={sessionId}
                    alreadyUnlocked={session.leadership_wiring_unlocked}
                  />
                </div>
              </div>
            ) : null}

            {currentStructureUnlocked || session.zone_of_investment_revealed ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">Zone of Investment reveal</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Separate from module unlocking -- reveals each participant&apos;s personalized
                  matrix.
                </p>
                <div className="mt-3">
                  <RevealZoneOfInvestmentControl
                    sessionId={sessionId}
                    alreadyRevealed={session.zone_of_investment_revealed}
                  />
                </div>
              </div>
            ) : null}

            {leverageUnlocked || session.priority_leverage_reveal_unlocked ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">Priority Leverage Opportunities reveal</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Separate from module unlocking -- reveals each participant&apos;s Priority Leverage
                  Opportunities and Executive Support Audit context.
                </p>
                <div className="mt-3">
                  <RevealPriorityLeverageControl
                    sessionId={sessionId}
                    alreadyRevealed={session.priority_leverage_reveal_unlocked}
                  />
                </div>
              </div>
            ) : null}

            {architectureUnlocked ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">Blueprint reveal</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Separate from module unlocking -- reveals the &quot;View my Blueprint&quot; link on
                  each eligible participant&apos;s dashboard.
                </p>
                <div className="mt-3">
                  <RevealBlueprintControl sessionId={sessionId} alreadyRevealed={session.blueprint_revealed} />
                </div>
              </div>
            ) : null}

            <div className="mt-6 border-t border-(--color-hairline) pt-6">
              <h3 className="text-sm font-medium">Final workshop feedback</h3>
              <p className="mt-1 text-xs text-(--color-ink-muted)">
                Once released, every eligible participant who has completed the workshop content
                is taken straight to the feedback step.
              </p>
              <div className="mt-3">
                <ReleaseWorkshopFeedbackControl
                  sessionId={sessionId}
                  alreadyReleased={session.workshop_feedback_released}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-xl">Participants</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              {roster?.length ?? 0} registered
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Company</th>
                    <th className="pb-2 pr-4">Current module</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Blueprint ready?</th>
                    <th className="pb-2 pr-4">Discuss?</th>
                    <th className="pb-2">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {roster && roster.length > 0 ? (
                    roster.map((row) => (
                      <tr key={row.id} className="border-b border-(--color-hairline)/60 hover:bg-(--color-accent-soft)/40">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/admin/sessions/${sessionId}/participants/${row.id}`}
                            className="block text-(--color-accent) hover:underline"
                          >
                            {row.participant?.first_name} {row.participant?.last_name}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">
                          {row.participant?.email}
                        </td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">
                          {row.participant?.company_name ?? "—"}
                        </td>
                        <td className="py-2 pr-4">{row.currentModuleName ?? "—"}</td>
                        <td className="py-2 pr-4 capitalize">
                          {row.completion_state.replace("_", " ")}
                        </td>
                        <td className="py-2 pr-4">{row.blueprintReady ? "Yes" : "—"}</td>
                        <td className="py-2 pr-4">{row.discussRequested ? "Yes" : "—"}</td>
                        <td className="py-2 text-(--color-ink-muted)">
                          {new Date(row.last_active_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-(--color-ink-muted)">
                        No one has registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="mt-8">
          <h2 className="font-serif text-xl">Results by module</h2>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-(--color-ink-muted)">
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
            Showing enabled modules only, based on {aggregates.registeredCount} registered participants. Click a
            module to see its sub-exercises.
          </p>

          <div className="mt-5 space-y-4">
            {resultSections.map((section) => (
              <div key={section.key} className="border-t border-(--color-hairline) pt-4">
                <Disclosure
                  label={
                    <span className="flex items-center gap-2 normal-case tracking-normal">
                      {section.name}
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
                </Disclosure>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </main>
  );
}
