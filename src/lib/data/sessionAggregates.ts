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
}

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
 */
export async function getSessionAggregates(sessionId: string): Promise<SessionAggregates> {
  const supabase = await createServerSupabaseClient();

  const [{ data: enrollments }, { data: modules }] = await Promise.all([
    supabase.from("participant_sessions").select("id, completion_state").eq("session_id", sessionId),
    supabase
      .from("modules")
      .select("id, key, name")
      .eq("active", true)
      .eq("requires_live_workshop", false)
      .order("sort_order", { ascending: true }),
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
    };
  }

  const [{ data: progressRows }, { data: responsibilityRows }, { data: priorityRows }, { data: recommendationRows }] =
    await Promise.all([
      supabase
        .from("participant_module_progress")
        .select("module_id, status")
        .in("participant_session_id", participantSessionIds),
      supabase
        .from("participant_responsibilities")
        .select("macro_zone, responsibility_id, responsibilities(label)")
        .in("participant_session_id", participantSessionIds),
      supabase
        .from("priority_delegation_opportunities")
        .select("responsibility_id, leverage_level_snapshot, responsibilities(label)")
        .in("participant_session_id", participantSessionIds),
      supabase
        .from("architecture_recommendations")
        .select("primary_signal_leverage_level, is_tied, reaction")
        .in("participant_session_id", participantSessionIds),
    ]);

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
  };
}
