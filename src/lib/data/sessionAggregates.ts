import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ModuleCompletionRow {
  key: string;
  name: string;
  notStarted: number;
  inProgress: number;
  complete: number;
}

export interface CountRow {
  label: string;
  count: number;
}

export interface ConstraintRankingRow {
  label: string;
  percentage: number;
}

export interface ExecutiveLeverageDiagnosticAggregates {
  startedCount: number;
  completedCount: number;
  completionRate: number;
  capacityBaseline: CountRow[];
  capacityPressurePercentage: number;
  cohortProfile: CountRow[];
  topConstraints: ConstraintRankingRow[];
  rockCompletion: CountRow[];
}

export interface ZoneOfInvestmentParticipantRow {
  name: string;
  mappedCount: number;
  investmentPercentage: number;
  ambiguityPercentage: number;
  vulnerabilityPercentage: number;
}

export interface ZoneOfInvestmentAggregates {
  mappingCompletionCount: number;
  mappingCompletionRate: number;
  revealViewedCount: number;
  revealViewedRate: number;
  perParticipant: ZoneOfInvestmentParticipantRow[];
}

export interface SessionAggregates {
  registeredCount: number;
  fullyCompletedCount: number;
  moduleCompletion: ModuleCompletionRow[];
  zoneDistribution: CountRow[];
  mostSelectedResponsibilities: CountRow[];
  mostCommonPriorityOpportunities: CountRow[];
  priorityLeverageDistribution: CountRow[];
  primarySignalDistribution: CountRow[];
  reactionDistribution: CountRow[];
  selfIdentificationDistribution: CountRow[];
  executiveLeverageDiagnostic: ExecutiveLeverageDiagnosticAggregates;
  zoneOfInvestment: ZoneOfInvestmentAggregates;
  whiteWhaleCompletionCount: number;
  whiteWhaleCompletionRate: number;
  leadershipWiringCompletionCount: number;
  leadershipWiringCompletionRate: number;
}

const EMPTY_ZONE_OF_INVESTMENT_AGGREGATES: ZoneOfInvestmentAggregates = {
  mappingCompletionCount: 0,
  mappingCompletionRate: 0,
  revealViewedCount: 0,
  revealViewedRate: 0,
  perParticipant: [],
};

const EMPTY_DIAGNOSTIC_AGGREGATES: ExecutiveLeverageDiagnosticAggregates = {
  startedCount: 0,
  completedCount: 0,
  completionRate: 0,
  capacityBaseline: [],
  capacityPressurePercentage: 0,
  cohortProfile: [],
  topConstraints: [],
  rockCompletion: [],
};

const ZONE_LABEL: Record<string, string> = {
  investment: "Zone of Investment",
  ambiguity: "Zone of Ambiguity",
  vulnerability: "Zone of Vulnerability",
};

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

const REACTION_LABEL: Record<string, string> = {
  yes: "Yes",
  mostly: "Mostly",
  not_yet: "Not yet",
};

const SELF_IDENTIFICATION_LABEL: Record<string, string> = {
  visionary: "Visionary",
  integrator: "Integrator",
  hybrid: "Hybrid",
};

function countBy<T>(rows: T[], keyFn: (row: T) => string | null | undefined, labelFor: (key: string) => string): CountRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ label: labelFor(key), count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Aggregates only over data the app actually captures. Deliberately does
 * not attempt Visionary/Integrator distribution, Executive Support Audit
 * results, current-support-role breakdowns, or EOS/Bloom usage -- none of
 * that content exists yet (see docs/CLIENT_QUESTIONS.md), and inventing
 * empty charts for it would be misleading rather than useful.
 *
 * Pass a single-element array to scope to one session (the original,
 * per-session use case), a longer array to combine specific sessions, or
 * omit `sessionIds` entirely for an org-wide rollup across every session
 * (brief section 16, cross-session analytics).
 */
export async function getSessionAggregates(sessionIds?: string[]): Promise<SessionAggregates> {
  const supabase = await createServerSupabaseClient();

  let enrollmentQuery = supabase
    .from("participant_sessions")
    .select("id, completion_state, self_identification, zone_of_investment_viewed_at, participants(first_name, last_name)");
  if (sessionIds) enrollmentQuery = enrollmentQuery.in("session_id", sessionIds);

  const [{ data: enrollments }, { data: modules }, { data: diagnosticAssessment }] = await Promise.all([
    enrollmentQuery,
    supabase
      .from("modules")
      .select("id, key, name")
      .eq("active", true)
      .eq("requires_live_workshop", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("assessments")
      .select("id")
      .eq("key", "executive_leverage_diagnostic")
      .eq("active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const participantSessionIds = (enrollments ?? []).map((e) => e.id);
  const registeredCount = participantSessionIds.length;
  const fullyCompletedCount = (enrollments ?? []).filter((e) => e.completion_state === "complete").length;

  if (participantSessionIds.length === 0) {
    return {
      registeredCount: 0,
      fullyCompletedCount: 0,
      moduleCompletion: (modules ?? []).map((m) => ({ key: m.key, name: m.name, notStarted: 0, inProgress: 0, complete: 0 })),
      zoneDistribution: [],
      mostSelectedResponsibilities: [],
      mostCommonPriorityOpportunities: [],
      priorityLeverageDistribution: [],
      primarySignalDistribution: [],
      reactionDistribution: [],
      selfIdentificationDistribution: [],
      executiveLeverageDiagnostic: EMPTY_DIAGNOSTIC_AGGREGATES,
      zoneOfInvestment: EMPTY_ZONE_OF_INVESTMENT_AGGREGATES,
      whiteWhaleCompletionCount: 0,
      whiteWhaleCompletionRate: 0,
      leadershipWiringCompletionCount: 0,
      leadershipWiringCompletionRate: 0,
    };
  }

  const diagnosticAssessmentId = diagnosticAssessment?.id ?? null;

  const [
    { data: progressRows },
    { data: responsibilityRows },
    { data: priorityRows },
    { data: recommendationRows },
    { data: diagnosticQuestions },
    { data: diagnosticResponses },
    { data: diagnosticResults },
    { data: reflectionRows },
  ] = await Promise.all([
    supabase
      .from("participant_module_progress")
      .select("module_id, status")
      .in("participant_session_id", participantSessionIds),
    supabase
      .from("participant_responsibilities")
      .select("participant_session_id, competency, passion, macro_zone, responsibility_id, responsibilities(label)")
      .in("participant_session_id", participantSessionIds),
    supabase
      .from("priority_delegation_opportunities")
      .select("responsibility_id, leverage_level_snapshot, responsibilities(label)")
      .in("participant_session_id", participantSessionIds),
    supabase
      .from("architecture_recommendations")
      .select("primary_signal_leverage_level, is_tied, reaction")
      .in("participant_session_id", participantSessionIds),
    diagnosticAssessmentId
      ? supabase
          .from("questions")
          .select("sort_order, scored, constraint_label, answer_options(value, label, metadata)")
          .eq("assessment_id", diagnosticAssessmentId)
          .eq("active", true)
      : Promise.resolve({ data: [] }),
    diagnosticAssessmentId
      ? supabase
          .from("responses")
          .select("participant_session_id, answer, questions!inner(assessment_id, sort_order)")
          .in("participant_session_id", participantSessionIds)
          .eq("questions.assessment_id", diagnosticAssessmentId)
      : Promise.resolve({ data: [] }),
    diagnosticAssessmentId
      ? supabase
          .from("assessment_results")
          .select("participant_session_id, overall_result, dimension_scores, assessments!inner(id)")
          .in("participant_session_id", participantSessionIds)
          .eq("assessments.id", diagnosticAssessmentId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("participant_reflections")
      .select("participant_session_id, white_whale")
      .in("participant_session_id", participantSessionIds),
  ]);

  const whiteWhaleCompletedCount = (reflectionRows ?? []).filter(
    (r) => (r.white_whale ?? "").trim().length > 0,
  ).length;
  const leadershipWiringCompletedCount = (enrollments ?? []).filter((e) => e.self_identification !== null).length;

  const moduleCompletion: ModuleCompletionRow[] = (modules ?? []).map((m) => {
    const rows = (progressRows ?? []).filter((p) => p.module_id === m.id);
    const complete = rows.filter((r) => r.status === "complete").length;
    const inProgress = rows.filter((r) => r.status === "in_progress").length;
    return {
      key: m.key,
      name: m.name,
      complete,
      inProgress,
      notStarted: registeredCount - complete - inProgress,
    };
  });

  const responsibilityLabelByResponsibility = (row: {
    responsibility_id: string;
    responsibilities: unknown;
  }) => (row.responsibilities as { label: string } | null)?.label ?? row.responsibility_id;

  const executiveLeverageDiagnostic = computeExecutiveLeverageDiagnosticAggregates({
    registeredCount,
    questions: diagnosticQuestions ?? [],
    responses: diagnosticResponses ?? [],
    results: diagnosticResults ?? [],
  });

  const zoneOfInvestment = computeZoneOfInvestmentAggregates({
    registeredCount,
    enrollments: enrollments ?? [],
    responsibilityRows: responsibilityRows ?? [],
  });

  return {
    registeredCount,
    fullyCompletedCount,
    moduleCompletion,
    zoneDistribution: countBy(
      responsibilityRows ?? [],
      (r) => r.macro_zone,
      (key) => ZONE_LABEL[key] ?? key,
    ),
    mostSelectedResponsibilities: countBy(
      responsibilityRows ?? [],
      (r) => responsibilityLabelByResponsibility(r),
      (label) => label,
    ).slice(0, 10),
    mostCommonPriorityOpportunities: countBy(
      priorityRows ?? [],
      (r) => responsibilityLabelByResponsibility(r),
      (label) => label,
    ).slice(0, 10),
    priorityLeverageDistribution: countBy(
      priorityRows ?? [],
      (r) => r.leverage_level_snapshot,
      (key) => LEVEL_LABEL[key] ?? key,
    ),
    primarySignalDistribution: countBy(
      recommendationRows ?? [],
      (r) => (r.is_tied ? "tied" : r.primary_signal_leverage_level),
      (key) => (key === "tied" ? "Mixed (no clear majority)" : (LEVEL_LABEL[key] ?? key)),
    ),
    reactionDistribution: countBy(
      recommendationRows ?? [],
      (r) => r.reaction,
      (key) => REACTION_LABEL[key] ?? key,
    ),
    selfIdentificationDistribution: countBy(
      enrollments ?? [],
      (e) => e.self_identification,
      (key) => SELF_IDENTIFICATION_LABEL[key] ?? key,
    ),
    executiveLeverageDiagnostic,
    zoneOfInvestment,
    whiteWhaleCompletionCount: whiteWhaleCompletedCount,
    whiteWhaleCompletionRate: registeredCount > 0 ? Math.round((whiteWhaleCompletedCount / registeredCount) * 1000) / 10 : 0,
    leadershipWiringCompletionCount: leadershipWiringCompletedCount,
    leadershipWiringCompletionRate:
      registeredCount > 0 ? Math.round((leadershipWiringCompletedCount / registeredCount) * 1000) / 10 : 0,
  };
}

/**
 * The Executive Leverage Diagnostic's 5-section facilitator dashboard
 * (Developer Implementation Specification V1, section 5). Top constraints
 * are read from assessment_results.dimension_scores -- the scoring RPC's
 * own snapshot -- rather than re-deriving scores here a second time.
 */
function computeExecutiveLeverageDiagnosticAggregates(params: {
  registeredCount: number;
  questions: {
    sort_order: number;
    scored: boolean;
    constraint_label: string | null;
    answer_options: { value: string; label: string; metadata: unknown }[] | null;
  }[];
  responses: { participant_session_id: string; answer: unknown; questions: unknown }[];
  results: { participant_session_id: string; overall_result: string | null; dimension_scores: unknown }[];
}): ExecutiveLeverageDiagnosticAggregates {
  const { registeredCount, questions, responses, results } = params;

  const baselineQuestion = questions.find((q) => q.sort_order === 0) ?? null;
  const rockQuestion = questions.find((q) => q.sort_order === 11) ?? null;
  const scoredQuestions = questions.filter((q) => q.scored && q.constraint_label);

  const questionSortOrderOf = (row: { questions: unknown }) =>
    (row.questions as { sort_order: number } | null)?.sort_order ?? null;

  const baselineResponses = responses.filter((r) => questionSortOrderOf(r) === 0);
  const rockResponses = responses.filter((r) => questionSortOrderOf(r) === 11);
  const startedCount = new Set(responses.map((r) => r.participant_session_id)).size;
  const completedCount = results.length;

  const labelForValue = (
    question: { answer_options: { value: string; label: string; metadata: unknown }[] | null } | null,
    value: unknown,
  ) => question?.answer_options?.find((o) => o.value === value)?.label ?? String(value ?? "");

  const capacityBaseline = countBy(
    baselineResponses,
    (r) => (r.answer as string | null) ?? null,
    (value) => labelForValue(baselineQuestion, value),
  );

  const capacityPressureCount = baselineResponses.filter((r) => {
    const option = baselineQuestion?.answer_options?.find((o) => o.value === r.answer);
    return (option?.metadata as { capacity_pressure?: boolean } | null)?.capacity_pressure === true;
  }).length;

  const rockCompletion = countBy(
    rockResponses,
    (r) => (r.answer as string | null) ?? null,
    (value) => labelForValue(rockQuestion, value),
  );

  const cohortProfile = countBy(
    results,
    (r) => r.overall_result,
    (label) => label,
  );

  const topConstraints: ConstraintRankingRow[] = scoredQuestions
    .map((q) => {
      const lowCount = results.filter((r) => {
        const scores = (r.dimension_scores as Record<string, number> | null) ?? {};
        const score = scores[q.constraint_label as string];
        return score === 0 || score === 1;
      }).length;
      return {
        label: q.constraint_label as string,
        percentage: completedCount > 0 ? Math.round((lowCount / completedCount) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  return {
    startedCount,
    completedCount,
    completionRate: registeredCount > 0 ? Math.round((completedCount / registeredCount) * 1000) / 10 : 0,
    capacityBaseline,
    capacityPressurePercentage:
      baselineResponses.length > 0 ? Math.round((capacityPressureCount / baselineResponses.length) * 1000) / 10 : 0,
    cohortProfile,
    topConstraints,
    rockCompletion,
  };
}

const ZONE_OF_INVESTMENT_MIN_MAPPED = 10;

/**
 * Zone of Investment's facilitator dashboard section (mapping completion,
 * reveal-viewed, per-participant table). Cohort macro-zone distribution
 * reuses the existing top-level zoneDistribution field rather than being
 * duplicated here.
 */
function computeZoneOfInvestmentAggregates(params: {
  registeredCount: number;
  enrollments: {
    id: string;
    zone_of_investment_viewed_at: string | null;
    participants: unknown;
  }[];
  responsibilityRows: {
    participant_session_id: string;
    competency: string | null;
    passion: string | null;
    macro_zone: string | null;
  }[];
}): ZoneOfInvestmentAggregates {
  const { registeredCount, enrollments, responsibilityRows } = params;

  const mappedByParticipant = new Map<string, { investment: number; ambiguity: number; vulnerability: number; total: number }>();
  for (const row of responsibilityRows) {
    if (row.competency === null || row.passion === null) continue;
    const entry = mappedByParticipant.get(row.participant_session_id) ?? {
      investment: 0,
      ambiguity: 0,
      vulnerability: 0,
      total: 0,
    };
    entry.total += 1;
    if (row.macro_zone === "investment") entry.investment += 1;
    else if (row.macro_zone === "ambiguity") entry.ambiguity += 1;
    else if (row.macro_zone === "vulnerability") entry.vulnerability += 1;
    mappedByParticipant.set(row.participant_session_id, entry);
  }

  const mappingCompletionCount = [...mappedByParticipant.values()].filter(
    (v) => v.total >= ZONE_OF_INVESTMENT_MIN_MAPPED,
  ).length;
  const revealViewedCount = enrollments.filter((e) => e.zone_of_investment_viewed_at !== null).length;

  const nameById = new Map(
    enrollments.map((e) => {
      const p = e.participants as { first_name: string; last_name: string } | null;
      return [e.id, p ? `${p.first_name} ${p.last_name}` : "[Removed participant]"];
    }),
  );

  const perParticipant: ZoneOfInvestmentParticipantRow[] = [...mappedByParticipant.entries()]
    .map(([participantSessionId, v]) => ({
      name: nameById.get(participantSessionId) ?? "[Removed participant]",
      mappedCount: v.total,
      investmentPercentage: v.total > 0 ? Math.round((v.investment / v.total) * 1000) / 10 : 0,
      ambiguityPercentage: v.total > 0 ? Math.round((v.ambiguity / v.total) * 1000) / 10 : 0,
      vulnerabilityPercentage: v.total > 0 ? Math.round((v.vulnerability / v.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.mappedCount - a.mappedCount);

  return {
    mappingCompletionCount,
    mappingCompletionRate: registeredCount > 0 ? Math.round((mappingCompletionCount / registeredCount) * 1000) / 10 : 0,
    revealViewedCount,
    revealViewedRate: registeredCount > 0 ? Math.round((revealViewedCount / registeredCount) * 1000) / 10 : 0,
    perParticipant,
  };
}
