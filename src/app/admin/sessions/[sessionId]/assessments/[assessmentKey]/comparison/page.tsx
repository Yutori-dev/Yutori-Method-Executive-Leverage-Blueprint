import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardData, getSessionName } from "@/lib/data/assessmentDashboards";
import { buildDyads, cohortComparison, fmtPct, type OwnershipClass, type DirectionClass } from "@/lib/assessmentStats";
import type { LeverageAuditConfig } from "@/lib/leverageAuditSchema";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

type Filter = "all" | "aligned" | "adjacent" | "meaningful" | "same" | "different";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "aligned", label: "Aligned" },
  { key: "adjacent", label: "Adjacent" },
  { key: "meaningful", label: "Meaningful Difference" },
  { key: "same", label: "Same Direction" },
  { key: "different", label: "Different Direction" },
];
const own: Record<Filter, OwnershipClass | null> = { all: null, aligned: "Aligned", adjacent: "Adjacent", meaningful: "Meaningful Difference", same: null, different: null };
const dir: Record<Filter, DirectionClass | null> = { all: null, aligned: null, adjacent: null, meaningful: null, same: "Same Direction", different: "Different Direction" };

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const dirLabel = (v: number) => (v === 1 ? "+1 More" : v === 0 ? "0 Right" : "-1 Less");

/** Manually generated, facilitator-only. Nothing is computed until the
 * facilitator presses Generate (?generate=1), and then only for pairs where
 * both sides are complete and share a dyad id. */
export default async function ComparisonPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ generate?: string; filter?: string; dyad?: string }>;
}) {
  const { sessionId } = await params;
  const { generate, filter: filterParam, dyad: dyadParam } = await searchParams;
  const filter = (FILTERS.find((f) => f.key === filterParam)?.key ?? "all") as Filter;

  const [sessionName, visionary, ea] = await Promise.all([
    getSessionName(sessionId),
    getDashboardData(sessionId, "ea_leverage_audit_visionary"),
    getDashboardData(sessionId, "ea_leverage_audit_ea"),
  ]);
  if (!sessionName || !visionary || !ea) notFound();

  const config = ea.config as unknown as LeverageAuditConfig;
  const generated = generate === "1";
  const dyads = generated ? buildDyads(config, visionary.rows, ea.rows) : [];
  const cohort = generated ? cohortComparison(config, dyads) : [];
  const selected = dyads.find((d) => d.dyadId === dyadParam) ?? dyads[0];

  return (
    <main className="py-16">
      <Container>
        <Link href={`/admin/sessions/${sessionId}/assessments/ea_leverage_audit_ea`} className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)">
          ← EA Leverage Audit dashboard
        </Link>
        <h1 className="mt-4 font-serif text-3xl">Executive–EA comparison</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">{sessionName}. Facilitator-only; never shown to participants.</p>

        {!generated ? (
          <Card className="mt-6">
            <p className="text-sm text-(--color-ink)">
              Nothing is generated automatically. Run it once the Executive and EA versions have both been completed.
            </p>
            <Link href="?generate=1" className="mt-3 inline-block rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-sm font-medium hover:border-(--color-accent)">
              Generate comparison
            </Link>
          </Card>
        ) : dyads.length === 0 ? (
          <Card className="mt-6">
            <p className="text-sm text-(--color-ink)">
              No comparison available yet. A pair needs a completed Executive assessment, a completed EA assessment, and the same Dyad ID
              (set by pairing the two profiles in the participant database before they submit).
            </p>
          </Card>
        ) : (
          <div className="mt-6 space-y-6">
            <Card>
              <h2 className="font-serif text-lg">Paired comparison</h2>
              <p className="mt-1 text-xs text-(--color-ink-muted)">{dyads.length} completed matched {dyads.length === 1 ? "pair" : "pairs"}.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dyads.map((d) => (
                  <Link key={d.dyadId} href={`?generate=1&dyad=${d.dyadId}&filter=${filter}`} className={`rounded-full border px-3 py-1 text-xs ${selected?.dyadId === d.dyadId ? "border-(--color-accent) text-(--color-accent)" : "border-(--color-hairline)"}`}>
                    {d.execName} / {d.eaName}
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Link key={f.key} href={`?generate=1&dyad=${selected?.dyadId}&filter=${f.key}`} className={`rounded-full border px-3 py-1 text-xs ${filter === f.key ? "border-(--color-accent) text-(--color-accent)" : "border-(--color-hairline)"}`}>
                    {f.label}
                  </Link>
                ))}
              </div>
              {selected ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-(--color-hairline) text-(--color-ink-muted)">
                        <th className="pb-2 pr-3">Responsibility</th><th className="pb-2 pr-3">Executive current</th><th className="pb-2 pr-3">EA current</th>
                        <th className="pb-2 pr-3">Ownership comparison</th><th className="pb-2 pr-3">Executive desired</th><th className="pb-2 pr-3">EA desired</th><th className="pb-2">Direction comparison</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.rows
                        .filter((r) => (own[filter] ? r.ownershipClass === own[filter] : true) && (dir[filter] ? r.directionClass === dir[filter] : true))
                        .map((r) => (
                          <tr key={r.responsibilityId} className="border-b border-(--color-hairline)/60">
                            <td className="py-2 pr-3 text-(--color-ink)">{r.name}</td>
                            <td className="py-2 pr-3">{r.execCurrent} / {config.ownershipLevels.find((l) => l.value === r.execCurrent)?.label}</td>
                            <td className="py-2 pr-3">{r.eaCurrent} / {config.ownershipLevels.find((l) => l.value === r.eaCurrent)?.label}</td>
                            <td className="py-2 pr-3">{r.ownershipClass} ({signed(r.ownershipDifference)})</td>
                            <td className="py-2 pr-3">{dirLabel(r.execDesired)}</td>
                            <td className="py-2 pr-3">{dirLabel(r.eaDesired)}</td>
                            <td className="py-2">{r.directionClass}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Card>
            <Card className="overflow-x-auto">
              <h2 className="font-serif text-lg">Cohort executive–EA comparison</h2>
              <p className="mt-1 text-xs text-(--color-ink-muted)">Percentages use completed matched pairs as the denominator.</p>
              <table className="mt-3 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-(--color-hairline) text-(--color-ink-muted)">
                    <th className="pb-2 pr-3">Responsibility</th><th className="pb-2 pr-3">Aligned</th><th className="pb-2 pr-3">Adjacent</th><th className="pb-2 pr-3">Meaningful diff.</th>
                    <th className="pb-2 pr-3">Same dir.</th><th className="pb-2 pr-3">Different dir.</th><th className="pb-2 pr-3">Avg exec</th><th className="pb-2">Avg EA</th>
                  </tr>
                </thead>
                <tbody>
                  {cohort.map((c) => (
                    <tr key={c.responsibilityId} className="border-b border-(--color-hairline)/60">
                      <td className="py-2 pr-3 text-(--color-ink)">{c.name}</td>
                      <td className="py-2 pr-3">{fmtPct(c.aligned)}</td><td className="py-2 pr-3">{fmtPct(c.adjacent)}</td><td className="py-2 pr-3">{fmtPct(c.meaningful)}</td>
                      <td className="py-2 pr-3">{fmtPct(c.same)}</td><td className="py-2 pr-3">{fmtPct(c.different)}</td>
                      <td className="py-2 pr-3">{c.avgExec.toFixed(1)}</td><td className="py-2">{c.avgEa.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </Container>
    </main>
  );
}
