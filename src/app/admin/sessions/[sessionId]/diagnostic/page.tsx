import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CountBarList } from "@/components/admin/CountBarList";

/** Executive Leverage Diagnostic (TM) facilitator dashboard, Developer
 * Implementation Specification V1 section 5 -- five sections, each with
 * the client's own verbatim interpretation-note copy. A dedicated page
 * rather than folding into /aggregate, matching how Presentation Mode and
 * the Follow-up Queue already got their own pages instead of overloading
 * the general aggregate view. */
export default async function ExecutiveLeverageDiagnosticDashboardPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  if (!session) notFound();

  const aggregates = await getSessionAggregates([sessionId]);
  const d = aggregates.executiveLeverageDiagnostic;

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to session
        </Link>

        <h1 className="mt-4 font-serif text-3xl">{session.name} — Executive Leverage Diagnostic™</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-serif text-lg">Completion</h2>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl text-(--color-ink)">{d.startedCount}</p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">Started</p>
              </div>
              <div>
                <p className="text-2xl text-(--color-ink)">{d.completedCount}</p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">Completed</p>
              </div>
              <div>
                <p className="text-2xl text-(--color-ink)">{d.completionRate}%</p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">Completion rate</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Cohort Executive Leverage Profile</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Represents the degree to which participants&apos; professional operating environments
              create independence around them versus remaining dependent on their personal
              capacity. This is not a measure of overall leadership effectiveness.
            </p>
            <div className="mt-4">
              <CountBarList rows={d.cohortProfile} emptyLabel="No completed diagnostics yet." />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Whole-Person Capacity Baseline</h2>
            <div className="mt-4">
              <CountBarList rows={d.capacityBaseline} emptyLabel="No responses yet." />
            </div>
            <div className="mt-4 border-t border-(--color-hairline) pt-4">
              <p className="text-sm text-(--color-ink)">
                Experiencing Meaningful Capacity Pressure: {d.capacityPressurePercentage}%
              </p>
              <p className="mt-1 text-xs text-(--color-ink-muted)">
                Represents the percentage of participants experiencing recurring trade-offs,
                sustained strain or sacrifice because of limited overall capacity. This is
                contextual data and does not affect the Executive Leverage Profile.
              </p>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Top Cohort Leverage Constraints</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              The percentage represents participants showing meaningful or strong dependency on
              that specific leverage signal. Higher percentages indicate more prevalent leverage
              constraints across the cohort.
            </p>
            <div className="mt-4 space-y-2">
              {d.topConstraints.length > 0 ? (
                d.topConstraints.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <span className="text-(--color-ink)">{c.label}</span>
                    <span className="text-(--color-ink-muted)">{c.percentage}%</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--color-ink-muted)">No completed diagnostics yet.</p>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Quarterly Priority / Rock Completion</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Represents reported organizational execution/accountability performance over the
              prior two quarters. This is contextual data and does not independently indicate
              executive dependency or affect the Executive Leverage Profile.
            </p>
            <div className="mt-4">
              <CountBarList rows={d.rockCompletion} emptyLabel="No responses yet." />
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
