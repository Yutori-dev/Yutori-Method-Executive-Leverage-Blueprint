import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CountBarList } from "@/components/admin/CountBarList";

/** Zone of Investment facilitator dashboard (client Implementation
 * Specification section 12) -- a dedicated page, matching the pattern
 * already used for the Executive Leverage Diagnostic, Presentation Mode,
 * and the Follow-up Queue instead of overloading /aggregate. */
export default async function ZoneOfInvestmentDashboardPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  if (!session) notFound();

  const aggregates = await getSessionAggregates([sessionId]);
  const z = aggregates.zoneOfInvestment;

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to session
        </Link>

        <h1 className="mt-4 font-serif text-3xl">{session.name} — Zone of Investment</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-serif text-lg">Completion</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl text-(--color-ink)">
                  {z.mappingCompletionCount} / {z.mappingCompletionRate}%
                </p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">Zone of Investment Mapping</p>
              </div>
              <div>
                <p className="text-2xl text-(--color-ink)">
                  {z.revealViewedCount} / {z.revealViewedRate}%
                </p>
                <p className="mt-1 text-xs text-(--color-ink-muted)">Map Reveal Viewed</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Cohort Macro-Zone Distribution</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              The distribution of mapped responsibilities across the three macro zones based on
              participants&apos; self-reported Competency and Passion.
            </p>
            <div className="mt-4">
              <CountBarList rows={aggregates.zoneDistribution} emptyLabel="No ratings yet." />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Participant-Level Summary</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Mapped</th>
                    <th className="pb-2 pr-4">% Investment</th>
                    <th className="pb-2 pr-4">% Ambiguity</th>
                    <th className="pb-2">% Vulnerability</th>
                  </tr>
                </thead>
                <tbody>
                  {z.perParticipant.length > 0 ? (
                    z.perParticipant.map((row) => (
                      <tr key={row.name} className="border-b border-(--color-hairline)/60">
                        <td className="py-2 pr-4">{row.name}</td>
                        <td className="py-2 pr-4">{row.mappedCount}</td>
                        <td className="py-2 pr-4">{row.investmentPercentage}%</td>
                        <td className="py-2 pr-4">{row.ambiguityPercentage}%</td>
                        <td className="py-2">{row.vulnerabilityPercentage}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-(--color-ink-muted)">
                        No responsibilities mapped yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
