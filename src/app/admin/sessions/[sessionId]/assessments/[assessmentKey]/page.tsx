import Link from "next/link";
import { notFound } from "next/navigation";
import { DASHBOARD_ASSESSMENTS, getDashboardData, getSessionName } from "@/lib/data/assessmentDashboards";
import {
  describeAnswer,
  eaExperienceStats,
  fmtPct,
  leverageStats,
  trapsStats,
} from "@/lib/assessmentStats";
import type { StructuredAssessmentConfig } from "@/lib/structuredAssessmentSchema";
import type { ThinkingTrapsConfig } from "@/lib/thinkingTrapsSchema";
import type { LeverageAuditConfig } from "@/lib/leverageAuditSchema";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CompletionBlock, StatBars } from "@/components/admin/StatBars";

interface FacilitatorCopy {
  insights?: Record<string, { label: string; interpretation: string; talkingPoint: string }>;
  cosTalkingPoints?: Record<string, string>;
  opportunityTemplate?: string;
  appropriateTemplate?: string;
}

const fill = (template: string, p: number) => template.replace("[XX%]", fmtPct(p));

export default async function AssessmentDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string; assessmentKey: string }>;
  searchParams: Promise<{ participant?: string }>;
}) {
  const { sessionId, assessmentKey } = await params;
  const { participant } = await searchParams;
  const meta = DASHBOARD_ASSESSMENTS.find((a) => a.key === assessmentKey);
  if (!meta) notFound();
  const [sessionName, data] = await Promise.all([getSessionName(sessionId), getDashboardData(sessionId, assessmentKey)]);
  if (!sessionName || !data) notFound();

  let body: React.ReactNode = null;

  if (assessmentKey === "ea_experience_assessment") {
    const config = data.config as unknown as StructuredAssessmentConfig;
    const s = eaExperienceStats(config, data.rows);
    const selected = participant ? data.rows.find((r) => r.psId === participant && r.status === "complete") : undefined;
    body = (
      <>
        <Card>
          <CompletionBlock
            items={[
              { label: "Participants started", value: s.completion.started },
              { label: "Participants completed", value: s.completion.completed },
              { label: "Completion rate", value: fmtPct(s.completion.rate) },
            ]}
          />
        </Card>
        <Card>
          <h2 className="font-serif text-lg">Participant responses</h2>
          <p className="mt-1 text-xs text-(--color-ink-muted)">Submitted assessments only. Select a participant to see their full submission.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.rows.filter((r) => r.status === "complete").map((r) => (
              <Link
                key={r.psId}
                href={`?participant=${r.psId}`}
                className={`rounded-full border px-3 py-1 text-xs ${participant === r.psId ? "border-(--color-accent) text-(--color-accent)" : "border-(--color-hairline) text-(--color-ink)"}`}
              >
                {r.name}
              </Link>
            ))}
          </div>
          {selected ? (
            <dl className="mt-4 space-y-3 text-sm">
              {config.questions.map((q) => (
                <div key={q.id}>
                  <dt className="text-xs text-(--color-ink-muted)">{q.prompt}</dt>
                  <dd className="whitespace-pre-line text-(--color-ink)">{describeAnswer(q, selected.answers)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Card>
        {s.singleSelects.map((q) => (
          <Card key={q.id}>
            <h3 className="font-serif text-base">{q.prompt}</h3>
            <div className="mt-3"><StatBars rows={q.options} /></div>
          </Card>
        ))}
        {s.matrices.map((m) => (
          <Card key={m.id}>
            <h3 className="font-serif text-base">{m.prompt}</h3>
            <div className="mt-4 space-y-5">
              {m.rows.map((row) => (
                <div key={row.label}>
                  <p className="text-sm text-(--color-ink)">{row.label}</p>
                  <div className="mt-2"><StatBars rows={row.options} /></div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        <Card>
          <h3 className="font-serif text-base">Development priorities</h3>
          <p className="mt-1 text-xs text-(--color-ink-muted)">Number selected, as a percentage of completed participants. Ranked highest first; ties keep the questionnaire order.</p>
          <div className="mt-3"><StatBars rows={s.priorities} /></div>
          {s.otherTexts.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-(--color-ink-muted)">&quot;Other&quot; responses</p>
              <ul className="mt-1 space-y-1 text-sm">
                {s.otherTexts.map((o, i) => (<li key={i}><span className="text-(--color-ink-muted)">{o.name}:</span> {o.text}</li>))}
              </ul>
            </div>
          ) : null}
        </Card>
        {s.openText.map((o) => (
          <Card key={o.questionId}>
            <h3 className="font-serif text-base">{o.prompt}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {o.entries.length === 0 ? <li className="text-(--color-ink-muted)">No responses.</li> : null}
              {o.entries.map((e, i) => (<li key={i}><span className="text-(--color-ink-muted)">{e.name}:</span> {e.text}</li>))}
            </ul>
          </Card>
        ))}
      </>
    );
  } else if (assessmentKey === "thinking_traps") {
    const config = data.config as unknown as StructuredAssessmentConfig & ThinkingTrapsConfig;
    const s = trapsStats(config, data.rows);
    body = (
      <>
        <Card>
          <CompletionBlock
            items={[
              { label: "Participants started", value: s.completion.started },
              { label: "Participants completed", value: s.completion.completed },
              { label: "Completion rate", value: fmtPct(s.completion.rate) },
            ]}
          />
        </Card>
        <Card>
          <h3 className="font-serif text-base">Cohort trap prevalence</h3>
          <p className="mt-1 text-xs text-(--color-ink-muted)">Participants scoring {config.qualify_threshold} or higher, as a share of completed participants.</p>
          <div className="mt-3"><StatBars rows={s.prevalence.map((p) => ({ label: p.name, count: p.count, pct: p.pct }))} /></div>
        </Card>
        <Card>
          <h3 className="font-serif text-base">Cohort average trap score</h3>
          <ul className="mt-3 space-y-1 text-sm">
            {s.averages.map((a) => (
              <li key={a.id} className="flex justify-between"><span>{a.name}</span><span className="text-(--color-ink-muted)">{a.avg.toFixed(1)} / 16</span></li>
            ))}
          </ul>
        </Card>
        <Card className="overflow-x-auto">
          <h3 className="font-serif text-base">Participant-level results</h3>
          <p className="mt-1 text-xs text-(--color-ink-muted)">Scores are facilitator-facing only.</p>
          <table className="mt-3 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-(--color-hairline) text-(--color-ink-muted)">
                <th className="pb-2 pr-3">Participant</th>
                {config.traps.map((t) => (<th key={t.id} className="pb-2 pr-3">{t.name.replace(" Trap", "")}</th>))}
                <th className="pb-2 pr-3">Top</th><th className="pb-2 pr-3">Second</th><th className="pb-2">Third</th>
              </tr>
            </thead>
            <tbody>
              {s.participants.map((p) => (
                <tr key={p.name} className="border-b border-(--color-hairline)/60">
                  <td className="py-2 pr-3 text-(--color-ink)">{p.name}</td>
                  {config.traps.map((t) => (<td key={t.id} className="py-2 pr-3">{p.scores[t.id]}</td>))}
                  <td className="py-2 pr-3">{p.top[0] ?? "—"}</td><td className="py-2 pr-3">{p.top[1] ?? "—"}</td><td className="py-2">{p.top[2] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </>
    );
  } else {
    const config = data.config as unknown as LeverageAuditConfig & { facilitator?: FacilitatorCopy };
    const isVisionary = assessmentKey === "ea_leverage_audit_visionary";
    const s = leverageStats(config, data.rows);
    const f = config.facilitator ?? {};
    body = (
      <>
        <Card>
          <CompletionBlock
            items={[
              { label: "Participants started", value: s.completion.started },
              { label: "Participants completed", value: s.completion.completed },
              ...(isVisionary ? [{ label: "Participants without current EA", value: s.completion.withoutEa }] : []),
              { label: isVisionary ? "Eligible completion rate" : "Completion rate", value: fmtPct(isVisionary ? s.completion.eligibleRate : s.completion.rate) },
            ]}
          />
          <p className="mt-3 text-xs text-(--color-ink-muted)">
            All cohort figures use completed {isVisionary ? "eligible " : "EA "}participants as the denominator.
          </p>
        </Card>
        {s.context.map((c) => (
          <Card key={c.id}>
            <h3 className="font-serif text-base">{c.prompt}</h3>
            <div className="mt-3"><StatBars rows={c.options} /></div>
          </Card>
        ))}
        <Card>
          <h3 className="font-serif text-base">Cohort EA ownership levels</h3>
          <div className="mt-3 space-y-3">
            {s.ownership.map((o) => (
              <div key={o.id} className="text-sm">
                <p className="text-(--color-ink)">{o.name}</p>
                <p className="text-xs text-(--color-ink-muted)">Orchestration+: {fmtPct(o.orchestration)} · Below Orchestration: {fmtPct(o.below)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-serif text-base">Top cohort opportunities for greater EA leverage</h3>
          <div className="mt-3 space-y-4">
            {s.topOpportunities.map((o) => {
              const copy = f.insights?.[o.id];
              return (
                <div key={o.id} className="text-sm">
                  <p className="font-medium text-(--color-ink)">{isVisionary && copy ? `${copy.label} — ${fmtPct(o.pct)}` : `${o.name} — ${fmtPct(o.pct)}`}</p>
                  <p className="text-(--color-ink-muted)">{isVisionary && copy ? fill(copy.interpretation, o.pct) : fill(f.opportunityTemplate ?? "[XX%] of EAs see an opportunity to take greater ownership in this area.", o.pct)}</p>
                  {isVisionary && copy ? <p className="mt-1 text-(--color-ink)"><span className="font-medium">Facilitator talking point:</span> {copy.talkingPoint}</p> : null}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h3 className="font-serif text-base">Cohort areas of appropriate EA leverage</h3>
          <div className="mt-3 space-y-3">
            {s.topAppropriate.map((o) => (
              <div key={o.id} className="text-sm">
                <p className="font-medium text-(--color-ink)">{o.name} — {fmtPct(o.pct)}</p>
                <p className="text-(--color-ink-muted)">{fill(f.appropriateTemplate ?? "[XX%] of the cohort report orchestration or proactive ownership in this area and say the current level feels right.", o.pct)}</p>
                <p className="text-xs text-(--color-ink-muted)">{o.macro}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-serif text-base">Cohort macro category view</h3>
          <div className="mt-3 space-y-2 text-sm">
            {s.macro.map((m) => (
              <div key={m.id}>
                <p className="text-(--color-ink)">{m.name}</p>
                <p className="text-xs text-(--color-ink-muted)">Greater EA leverage opportunity: {fmtPct(m.opportunity)} · Appropriately supported &amp; leveraged: {fmtPct(m.appropriate)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-serif text-base">{isVisionary ? "Chief of Staff territory" : "Above-and-beyond EA scope"}</h3>
          <div className="mt-3 space-y-4 text-sm">
            {s.cos.map((c) => (
              <div key={c.id}>
                <p className="font-medium text-(--color-ink)">{c.name}</p>
                <p className="text-xs text-(--color-ink-muted)">
                  {isVisionary ? "EA currently in Chief of Staff territory" : "Currently delivering above and beyond traditional EA scope"}: {fmtPct(c.high)} · Greater ownership desired: {fmtPct(c.desired)} · {isVisionary ? "Already in Chief of Staff territory + more desired" : "Above-and-beyond scope + greater ownership desired"}: {fmtPct(c.both)}
                </p>
                {isVisionary && f.cosTalkingPoints?.[c.id] ? <p className="mt-1 text-(--color-ink)"><span className="font-medium">Facilitator talking point:</span> {f.cosTalkingPoints[c.id]}</p> : null}
              </div>
            ))}
          </div>
        </Card>
        {!isVisionary ? (
          <Card>
            <h3 className="font-serif text-base">Executive–EA comparison</h3>
            <p className="mt-1 text-sm text-(--color-ink-muted)">Generated manually once both sides of a pair have completed their assessments.</p>
            <Link href={`/admin/sessions/${sessionId}/assessments/ea_leverage_audit_ea/comparison`} className="mt-3 inline-block text-sm text-(--color-accent) hover:underline">
              Open comparison tools
            </Link>
          </Card>
        ) : null}
      </>
    );
  }

  return (
    <main className="py-16">
      <Container>
        <Link href={`/admin/sessions/${sessionId}/assessments`} className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)">
          ← All dashboards
        </Link>
        <h1 className="mt-4 font-serif text-3xl">{meta.label}</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">{sessionName}</p>
        <div className="mt-6 space-y-6">{body}</div>
      </Container>
    </main>
  );
}
