import type { Json } from "@/types/database";

/**
 * Visionary Thinking Traps Diagnostic -- scoring/classification types and
 * the pure scoring function, kept separate from structuredAssessmentSchema
 * because these fields (traps, scale_values, tie_break_order) only exist
 * on this one assessment's config, not the generic shape every module
 * shares.
 */

export interface TrapConfig {
  id: string;
  name: string;
  statement: string;
  question_ids: string[];
  trigger: string;
  how_it_shows_up: string;
  friction: string;
  shift: string;
}

export interface ThinkingTrapsConfig {
  qualify_threshold: number;
  max_results: number;
  tie_break_order: string[];
  traps: TrapConfig[];
  scale_values: Record<string, number>;
  no_qualifying_result: { title: string; body: string };
  result_intro: { title: string; body: string };
}

export interface ThinkingTrapsDerived {
  trapScores: Record<string, number>;
  qualifyingTraps: string[];
}

/** Trap score = sum of its four items' internal values (label -> number via
 * scale_values, since the answer is stored as the option label like every
 * other single_select question). Ranks by score desc, ties broken by the
 * spec's fixed priority order, capped at max_results, threshold-gated. */
export function scoreThinkingTraps(
  config: ThinkingTrapsConfig,
  answers: Record<string, Json>,
): ThinkingTrapsDerived {
  const trapScores: Record<string, number> = {};
  for (const trap of config.traps) {
    trapScores[trap.id] = trap.question_ids.reduce((sum, qId) => {
      const label = answers[qId];
      const value = typeof label === "string" ? (config.scale_values[label] ?? 0) : 0;
      return sum + value;
    }, 0);
  }

  const priorityIndex = new Map(config.tie_break_order.map((id, i) => [id, i]));
  const qualifyingTraps = config.traps
    .filter((t) => trapScores[t.id] >= config.qualify_threshold)
    .sort((a, b) => {
      const scoreDiff = trapScores[b.id] - trapScores[a.id];
      if (scoreDiff !== 0) return scoreDiff;
      return (priorityIndex.get(a.id) ?? 999) - (priorityIndex.get(b.id) ?? 999);
    })
    .slice(0, config.max_results)
    .map((t) => t.id);

  return { trapScores, qualifyingTraps };
}
