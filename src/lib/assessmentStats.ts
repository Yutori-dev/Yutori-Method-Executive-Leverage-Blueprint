import { scoreThinkingTraps, type ThinkingTrapsConfig } from "@/lib/thinkingTrapsSchema";
import type { LeverageAuditAnswers, LeverageAuditConfig } from "@/lib/leverageAuditSchema";
import type { StructuredAssessmentConfig, StructuredQuestion } from "@/lib/structuredAssessmentSchema";
import type { Json } from "@/types/database";

/** Pure facilitator-dashboard math for the new modules. Every percentage's
 * denominator is stated where it is computed -- the specs are explicit that
 * it is "completed" (and, for the Leverage Audit, "eligible") participants. */

export interface SubmissionRow {
  psId: string;
  name: string;
  status: "not_started" | "in_progress" | "complete";
  answers: Record<string, Json>;
  dyadId: string | null;
  completedAt: string | null;
}

export const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
export const fmtPct = (v: number) => `${Math.round(v)}%`;

export interface Completion {
  started: number;
  completed: number;
  rate: number;
}
export function completion(rows: SubmissionRow[]): Completion {
  const started = rows.filter((r) => r.status !== "not_started").length;
  const completed = rows.filter((r) => r.status === "complete").length;
  return { started, completed, rate: pct(completed, started) };
}

export interface OptionCount {
  label: string;
  count: number;
  pct: number;
}
function countOptions(options: string[], values: (string | undefined)[], denominator: number): OptionCount[] {
  return options.map((label) => {
    const count = values.filter((v) => v === label).length;
    return { label, count, pct: pct(count, denominator) };
  });
}

/* ---------------------------- EA Experience ----------------------------- */

export interface EaExperienceStats {
  completion: Completion;
  singleSelects: { id: string; prompt: string; options: OptionCount[] }[];
  matrices: { id: string; prompt: string; rows: { label: string; options: OptionCount[] }[] }[];
  priorities: { label: string; count: number; pct: number }[];
  otherTexts: { name: string; text: string }[];
  openText: { questionId: string; prompt: string; entries: { name: string; text: string }[] }[];
}

const COHORT_SINGLE = ["q4", "q5", "q6", "q7", "q8", "q9", "q10", "q13", "q17"];

export function eaExperienceStats(config: StructuredAssessmentConfig, rows: SubmissionRow[]): EaExperienceStats {
  const done = rows.filter((r) => r.status === "complete");
  const byId = new Map(config.questions.map((q) => [q.id, q]));
  const str = (r: SubmissionRow, id: string) => (typeof r.answers[id] === "string" ? (r.answers[id] as string) : undefined);

  const singleSelects = COHORT_SINGLE.flatMap((id) => {
    const q = byId.get(id);
    if (!q || q.type !== "single_select") return [];
    return [{ id, prompt: q.prompt, options: countOptions(q.options, done.map((r) => str(r, id)), done.length) }];
  });

  const matrices = ["q11", "q12"].flatMap((id) => {
    const q = byId.get(id);
    if (!q || q.type !== "matrix") return [];
    return [
      {
        id,
        prompt: q.prompt,
        rows: q.rows.map((row) => ({
          label: row.label,
          options: countOptions(
            q.options,
            done.map((r) => ((r.answers[id] as Record<string, string> | undefined) ?? {})[row.id]),
            done.length,
          ),
        })),
      },
    ];
  });

  const q14 = byId.get("q14");
  const priorities =
    q14 && q14.type === "multi_select"
      ? q14.options
          .map((o, order) => {
            const count = done.filter((r) => Array.isArray(r.answers.q14) && (r.answers.q14 as string[]).includes(o.id)).length;
            return { label: o.label, count, pct: pct(count, done.length), order };
          })
          // highest percentage first; ties keep the spec's option order
          .sort((a, b) => b.pct - a.pct || a.order - b.order)
          .map(({ label, count, pct: p }) => ({ label, count, pct: p }))
      : [];

  const otherId = q14 && q14.type === "multi_select" ? q14.otherOptionId : undefined;
  const otherTexts = done
    .filter((r) => otherId && Array.isArray(r.answers.q14) && (r.answers.q14 as string[]).includes(otherId))
    .map((r) => ({ name: r.name, text: str(r, "q14__other") ?? "" }))
    .filter((e) => e.text);

  const openText = ["q3", "q15", "q16"].flatMap((id) => {
    const q = byId.get(id);
    if (!q) return [];
    return [
      {
        questionId: id,
        prompt: q.prompt,
        entries: done.map((r) => ({ name: r.name, text: str(r, id) ?? "" })).filter((e) => e.text),
      },
    ];
  });

  return { completion: completion(rows), singleSelects, matrices, priorities, otherTexts, openText };
}

export function describeAnswer(q: StructuredQuestion, answers: Record<string, Json>): string {
  const v = answers[q.id];
  if (q.type === "matrix") {
    const m = (v as Record<string, string> | undefined) ?? {};
    return q.rows.map((r) => `${r.label}: ${m[r.id] ?? "—"}`).join("\n");
  }
  if (q.type === "multi_select") {
    const ids = Array.isArray(v) ? (v as string[]) : [];
    const labels = ids.map((id) => q.options.find((o) => o.id === id)?.label ?? id);
    const other = answers[`${q.id}__other`];
    return [...labels, ...(typeof other === "string" && other ? [`Other: ${other}`] : [])].join("; ") || "—";
  }
  return typeof v === "string" && v ? v : "—";
}

/* ----------------------------- Thinking Traps ---------------------------- */

export interface TrapsStats {
  completion: Completion;
  prevalence: { id: string; name: string; count: number; pct: number }[];
  averages: { id: string; name: string; avg: number }[];
  participants: { name: string; scores: Record<string, number>; top: string[] }[];
}

export function trapsStats(config: ThinkingTrapsConfig, rows: SubmissionRow[]): TrapsStats {
  const done = rows.filter((r) => r.status === "complete");
  const scored = done.map((r) => ({ name: r.name, ...scoreThinkingTraps(config, r.answers) }));
  const priority = new Map(config.tie_break_order.map((id, i) => [id, i]));

  const prevalence = config.traps
    .map((t) => {
      const count = scored.filter((s) => s.trapScores[t.id] >= config.qualify_threshold).length;
      return { id: t.id, name: t.name, count, pct: pct(count, done.length) };
    })
    .sort((a, b) => b.pct - a.pct || (priority.get(a.id) ?? 99) - (priority.get(b.id) ?? 99));

  const averages = config.traps.map((t) => ({
    id: t.id,
    name: t.name,
    avg: done.length ? scored.reduce((sum, s) => sum + s.trapScores[t.id], 0) / done.length : 0,
  }));

  return {
    completion: completion(rows),
    prevalence,
    averages,
    participants: scored.map((s) => ({
      name: s.name,
      scores: s.trapScores,
      top: s.qualifyingTraps.map((id) => config.traps.find((t) => t.id === id)?.name ?? id),
    })),
  };
}

/* ----------------------------- Leverage Audit ---------------------------- */

type Resp = { current?: number; desired?: number };
const respOf = (r: SubmissionRow): Record<string, Resp> =>
  ((r.answers as unknown as LeverageAuditAnswers).responses ?? {}) as Record<string, Resp>;
const noEa = (r: SubmissionRow) => (r.answers as unknown as LeverageAuditAnswers).noCurrentEa === true;
const ctx = (r: SubmissionRow, id: string) => ((r.answers as unknown as LeverageAuditAnswers).context ?? {})[id];

export interface LeverageStats {
  completion: Completion & { withoutEa: number; eligibleRate: number };
  context: { id: string; prompt: string; options: OptionCount[] }[];
  ownership: { id: string; name: string; orchestration: number; below: number }[];
  topOpportunities: { id: string; name: string; pct: number }[];
  topAppropriate: { id: string; name: string; macro: string; pct: number }[];
  macro: { id: string; name: string; opportunity: number; appropriate: number }[];
  cos: { id: string; name: string; high: number; desired: number; both: number }[];
}

/** Denominator for every cohort number: completed, eligible (has an EA)
 * participants. Participants who chose "I do not currently have an EA" are
 * excluded everywhere (spec section 10). */
export function leverageStats(config: LeverageAuditConfig, rows: SubmissionRow[]): LeverageStats {
  const started = rows.filter((r) => r.status !== "not_started");
  const withoutEa = started.filter(noEa).length;
  const startedEligible = started.length - withoutEa;
  const eligible = rows.filter((r) => r.status === "complete" && !noEa(r));
  const n = eligible.length;

  const eaItems = config.responsibilities.filter((r) => r.type === "EA");
  const cosItems = config.responsibilities.filter((r) => r.type === "COS");
  const opp = (r: SubmissionRow, id: string) => {
    const x = respOf(r)[id];
    return !!x && x.current !== undefined && x.current <= 2 && x.desired === 1;
  };
  const appr = (r: SubmissionRow, id: string) => {
    const x = respOf(r)[id];
    return !!x && x.current !== undefined && x.current >= 3 && x.desired === 0;
  };

  // The tenure question's "I do not currently have an EA" option is not
  // displayed as a dashboard bar (those participants are excluded).
  const context = config.contextQuestions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options
      .filter((o) => o.value !== q.exitOnValue)
      .map((o) => {
        const count = eligible.filter((r) => ctx(r, q.id) === o.value).length;
        return { label: o.label, count, pct: pct(count, n) };
      }),
  }));

  const macroName = (id: string | null) => config.macroCategories.find((m) => m.id === id)?.name ?? "";

  return {
    completion: {
      started: started.length,
      completed: rows.filter((r) => r.status === "complete").length,
      rate: pct(rows.filter((r) => r.status === "complete").length, started.length),
      withoutEa,
      eligibleRate: pct(n, startedEligible),
    },
    context,
    ownership: eaItems.map((r) => {
      const hi = eligible.filter((s) => (respOf(s)[r.id]?.current ?? -1) >= 3).length;
      const lo = eligible.filter((s) => {
        const c = respOf(s)[r.id]?.current;
        return c !== undefined && c <= 2;
      }).length;
      return { id: r.id, name: r.name, orchestration: pct(hi, n), below: pct(lo, n) };
    }),
    // Sort is stable, so equal percentages keep assessment order.
    topOpportunities: eaItems
      .map((r) => ({ id: r.id, name: r.name, pct: pct(eligible.filter((s) => opp(s, r.id)).length, n) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5),
    topAppropriate: eaItems
      .map((r) => ({ id: r.id, name: r.name, macro: macroName(r.macroCategory), pct: pct(eligible.filter((s) => appr(s, r.id)).length, n) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5),
    macro: config.macroCategories.map((m) => {
      const ids = eaItems.filter((r) => r.macroCategory === m.id).map((r) => r.id);
      return {
        id: m.id,
        name: m.name,
        opportunity: pct(eligible.filter((s) => ids.some((id) => opp(s, id))).length, n),
        appropriate: pct(eligible.filter((s) => ids.some((id) => appr(s, id))).length, n),
      };
    }),
    cos: cosItems.map((r) => ({
      id: r.id,
      name: r.name,
      high: pct(eligible.filter((s) => (respOf(s)[r.id]?.current ?? -1) >= 3).length, n),
      desired: pct(eligible.filter((s) => respOf(s)[r.id]?.desired === 1).length, n),
      both: pct(eligible.filter((s) => (respOf(s)[r.id]?.current ?? -1) >= 3 && respOf(s)[r.id]?.desired === 1).length, n),
    })),
  };
}

/* ------------------------------- Dyad views ------------------------------ */

export type OwnershipClass = "Aligned" | "Adjacent" | "Meaningful Difference";
export type DirectionClass = "Same Direction" | "Different Direction";

export interface DyadRow {
  responsibilityId: string;
  name: string;
  execCurrent: number;
  eaCurrent: number;
  ownershipDifference: number;
  ownershipClass: OwnershipClass;
  execDesired: number;
  eaDesired: number;
  directionClass: DirectionClass;
}
export interface Dyad {
  dyadId: string;
  execName: string;
  eaName: string;
  rows: DyadRow[];
}

export function classifyOwnership(diff: number): OwnershipClass {
  const a = Math.abs(diff);
  return a === 0 ? "Aligned" : a === 1 ? "Adjacent" : "Meaningful Difference";
}

/** A dyad exists only when BOTH sides are complete, neither opted out as
 * "no EA", and both carry the same dyad id (spec section 16). Matched on
 * dyad id + responsibility id; difference = EA - Executive, signed. */
export function buildDyads(config: LeverageAuditConfig, visionaryRows: SubmissionRow[], eaRows: SubmissionRow[]): Dyad[] {
  const execs = new Map(
    visionaryRows.filter((r) => r.status === "complete" && !noEa(r) && r.dyadId).map((r) => [r.dyadId as string, r]),
  );
  const dyads: Dyad[] = [];
  for (const ea of eaRows) {
    if (ea.status !== "complete" || !ea.dyadId) continue;
    const exec = execs.get(ea.dyadId);
    if (!exec) continue;
    const rows: DyadRow[] = [];
    for (const r of config.responsibilities) {
      const e = respOf(exec)[r.id];
      const a = respOf(ea)[r.id];
      if (!e || !a || e.current === undefined || a.current === undefined || e.desired === undefined || a.desired === undefined) continue;
      const diff = a.current - e.current;
      rows.push({
        responsibilityId: r.id,
        name: r.name,
        execCurrent: e.current,
        eaCurrent: a.current,
        ownershipDifference: diff,
        ownershipClass: classifyOwnership(diff),
        execDesired: e.desired,
        eaDesired: a.desired,
        directionClass: e.desired === a.desired ? "Same Direction" : "Different Direction",
      });
    }
    dyads.push({ dyadId: ea.dyadId, execName: exec.name, eaName: ea.name, rows });
  }
  return dyads;
}

export interface CohortComparisonRow {
  responsibilityId: string;
  name: string;
  aligned: number;
  adjacent: number;
  meaningful: number;
  same: number;
  different: number;
  avgExec: number;
  avgEa: number;
}
/** Denominator: completed matched dyads. No overall/macro alignment score
 * is calculated (spec section 17). */
export function cohortComparison(config: LeverageAuditConfig, dyads: Dyad[]): CohortComparisonRow[] {
  return config.responsibilities.map((r) => {
    const rows = dyads.map((d) => d.rows.find((x) => x.responsibilityId === r.id)).filter((x): x is DyadRow => !!x);
    const n = rows.length;
    const avg = (f: (x: DyadRow) => number) => (n ? rows.reduce((s, x) => s + f(x), 0) / n : 0);
    return {
      responsibilityId: r.id,
      name: r.name,
      aligned: pct(rows.filter((x) => x.ownershipClass === "Aligned").length, n),
      adjacent: pct(rows.filter((x) => x.ownershipClass === "Adjacent").length, n),
      meaningful: pct(rows.filter((x) => x.ownershipClass === "Meaningful Difference").length, n),
      same: pct(rows.filter((x) => x.directionClass === "Same Direction").length, n),
      different: pct(rows.filter((x) => x.directionClass === "Different Direction").length, n),
      avgExec: avg((x) => x.execCurrent),
      avgEa: avg((x) => x.eaCurrent),
    };
  });
}
