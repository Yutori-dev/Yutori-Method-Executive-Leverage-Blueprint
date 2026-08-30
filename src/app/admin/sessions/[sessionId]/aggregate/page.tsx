import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CountBarList } from "@/components/admin/CountBarList";

export default async function SessionAggregatePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  if (!session) notFound();

  const aggregates = await getSessionAggregates([sessionId]);

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

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Module completion</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                    <th className="pb-2 pr-4">Module</th>
                    <th className="pb-2 pr-4">Not started</th>
                    <th className="pb-2 pr-4">In progress</th>
                    <th className="pb-2">Complete</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.moduleCompletion.map((m) => (
                    <tr key={m.key} className="border-b border-(--color-hairline)/60">
                      <td className="py-2 pr-4">{m.name}</td>
                      <td className="py-2 pr-4 text-(--color-ink-muted)">{m.notStarted}</td>
                      <td className="py-2 pr-4 text-(--color-ink-muted)">{m.inProgress}</td>
                      <td className="py-2">{m.complete}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Zone of Investment distribution</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Across every responsibility every participant rated, not per-participant.
            </p>
            <div className="mt-4">
              <CountBarList rows={aggregates.zoneDistribution} emptyLabel="No ratings yet." />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Most selected responsibilities</h2>
            <div className="mt-4">
              <CountBarList rows={aggregates.mostSelectedResponsibilities} emptyLabel="No selections yet." />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Most common Priority Delegation Opportunities</h2>
            <div className="mt-4">
              <CountBarList rows={aggregates.mostCommonPriorityOpportunities} emptyLabel="No priority opportunities selected yet." />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Priority opportunity leverage distribution</h2>
            <div className="mt-4">
              <CountBarList rows={aggregates.priorityLeverageDistribution} emptyLabel="No priority opportunities selected yet." />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Pressure test</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              &ldquo;If you no longer owned these responsibilities, would you experience a
              meaningful increase in available capacity?&rdquo;
            </p>
            <div className="mt-4">
              <CountBarList rows={aggregates.pressureTestDistribution} emptyLabel="No pressure test responses yet." />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Executive Support Audit</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              {aggregates.executiveSupportAudit.completedCount} of {aggregates.registeredCount} complete /{" "}
              {aggregates.executiveSupportAudit.completionRate}%
            </p>
            <p className="mt-3 text-xs tracking-wide text-(--color-ink-muted) uppercase">Primary leverage gap frequency</p>
            <div className="mt-2">
              <CountBarList rows={aggregates.executiveSupportAudit.primaryFrequency} emptyLabel="No completed audits yet." />
            </div>
            <p className="mt-4 text-xs tracking-wide text-(--color-ink-muted) uppercase">Secondary leverage gap frequency</p>
            <div className="mt-2">
              <CountBarList rows={aggregates.executiveSupportAudit.secondaryFrequency} emptyLabel="No completed audits yet." />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-(--color-hairline) pt-4 text-sm">
              <div>
                <p className="text-(--color-ink)">{aggregates.executiveSupportAudit.tiedPrimaryCount}</p>
                <p className="text-xs text-(--color-ink-muted)">Tied primary results</p>
              </div>
              <div>
                <p className="text-(--color-ink)">{aggregates.executiveSupportAudit.noSecondaryCount}</p>
                <p className="text-xs text-(--color-ink-muted)">No clear secondary</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Primary recommendation signal</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              &quot;Mixed&quot; means the participant&apos;s three priorities didn&apos;t share a
              majority leverage level.
            </p>
            <div className="mt-4">
              <CountBarList rows={aggregates.primarySignalDistribution} emptyLabel="No recommendations calculated yet." />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Architecture reaction</h2>
            <div className="mt-4">
              <CountBarList rows={aggregates.reactionDistribution} emptyLabel="No reactions submitted yet." />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Visionary / Integrator / Hybrid</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Leadership Wiring completion: {aggregates.leadershipWiringCompletionCount} of{" "}
              {aggregates.registeredCount} / {aggregates.leadershipWiringCompletionRate}%
            </p>
            <div className="mt-4">
              <CountBarList rows={aggregates.selfIdentificationDistribution} emptyLabel="No self-identifications yet." />
            </div>
            {aggregates.leadershipWiringDashboardNote ? (
              <p className="mt-3 text-xs text-(--color-ink-muted)">{aggregates.leadershipWiringDashboardNote}</p>
            ) : null}
          </Card>

          <Card>
            <h2 className="font-serif text-lg">White Whale completion</h2>
            <p className="mt-4 text-2xl text-(--color-ink)">
              {aggregates.whiteWhaleCompletionCount} of {aggregates.registeredCount} /{" "}
              {aggregates.whiteWhaleCompletionRate}%
            </p>
          </Card>
        </div>
      </Container>
    </main>
  );
}
