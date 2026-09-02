import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CountBarList } from "@/components/admin/CountBarList";

/** Brief section 16: cross-session analytics. Generalizes the per-session
 * aggregate view (getSessionAggregates) across every session instead of
 * one, for Yutori's own program-wide reporting rather than a single
 * facilitator's cohort. */
export default async function CrossSessionAnalyticsPage() {
  const supabase = await createServerSupabaseClient();

  const [{ count: sessionCount }, aggregates] = await Promise.all([
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    getSessionAggregates(),
  ]);

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Analytics — all sessions</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {sessionCount ?? 0} session{sessionCount === 1 ? "" : "s"} · {aggregates.registeredCount} registered ·{" "}
          {aggregates.fullyCompletedCount} completed every module
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
                  {aggregates.moduleCompletion.map((m) => {
                    const isMostlyDone =
                      aggregates.registeredCount > 0 && m.complete / aggregates.registeredCount >= 0.75;
                    return (
                      <tr key={m.key} className="border-b border-(--color-hairline)/60">
                        <td className="py-2 pr-4">{m.name}</td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">{m.notStarted}</td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">{m.inProgress}</td>
                        <td className={isMostlyDone ? "py-2 font-medium text-(--color-success)" : "py-2"}>
                          {m.complete}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Zone of Investment distribution</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Across every responsibility every participant rated, every session.
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
            <h2 className="font-serif text-lg">Leadership Wiring</h2>
            <div className="mt-4">
              <CountBarList rows={aggregates.selfIdentificationDistribution} emptyLabel="No self-identifications yet." />
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
