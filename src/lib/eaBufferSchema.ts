/**
 * EA Buffer Assessment (v2.0, Toledo Visionary Lab) -- config shape, the pure
 * scoring/classification/ranking functions and the selection rules behind the
 * participant snapshot. A standalone assessment: it never touches the EA
 * Leverage Audit or the dyad logic.
 *
 * Scoring (spec section 7): Function Score = (Q1+Q2+Q3+Q4)/4 over the four
 * 0-4 Current Ownership answers, classified on the exact score. There is no
 * overall/composite score anywhere.
 */

export interface BufferContextOption {
  value: string;
  label: string;
}
export interface BufferContextQuestion {
  id: string;
  prompt: string;
  options: BufferContextOption[];
  /** Selecting this option value ends the assessment (spec section 4). */
  exitOnValue?: string;
}
export interface BufferOwnershipLevel {
  value: 0 | 1 | 2 | 3 | 4;
  label: string;
  description: string;
}
export interface BufferResponsibility {
  id: string;
  name: string;
  description: string;
}
export interface BufferFunction {
  id: string;
  name: string;
  description: string;
  responsibilities: BufferResponsibility[];
}

export type BufferClassId = "strong" | "developing" | "underdeveloped";

/** Spec section 7 thresholds, and how many responsibilities the facilitator
 * dashboard's top lists show (spec 9.3 rule 9: exactly three). */
export interface EaBufferRules {
  strongMin: number;
  developingMin: number;
  topN: number;
}
export const DEFAULT_BUFFER_RULES: EaBufferRules = { strongMin: 3, developingMin: 2, topN: 3 };
export function bufferRules(config: { rules?: Partial<EaBufferRules> }): EaBufferRules {
  return { ...DEFAULT_BUFFER_RULES, ...(config.rules ?? {}) };
}

export interface EaBufferConfig {
  rules?: Partial<EaBufferRules>;
  intro: { title: string; body: string[]; cta: string };
  contextQuestions: BufferContextQuestion[];
  exitMessage: string;
  scale: { body: string[]; cta: string };
  questionPrompt: string;
  ownershipLevels: BufferOwnershipLevel[];
  functions: BufferFunction[];
  classificationLabels: Record<BufferClassId, string>;
  results: {
    title: string;
    subtitle: string;
    intro: string;
    headings: { strongest: string; needs: string; opportunity: string };
    /** Exact interpretation text per function and classification (spec 8.5). */
    interpretations: Record<string, Record<BufferClassId, string>>;
    /** Section 3 framing when every function is Strong (spec 8.4). */
    allStrongFraming: string;
  };
  dashboard: {
    completedSuffix: string;
    waiting: string;
    sectionA: { heading: string; supporting: string };
    sectionB: { heading: string; supporting: string };
    sectionC: { heading: string; supporting: string };
  };
}

export interface EaBufferAnswers {
  context: Record<string, string>;
  /** Keyed by responsibility id -> 0-4. */
  ownership: Record<string, number>;
  noCurrentEa?: boolean;
}

export interface BufferFunctionResult {
  id: string;
  name: string;
  /** Four underlying ownership values, in question order. */
  values: number[];
  responsibilityIds: string[];
  average: number;
  classification: BufferClassId;
  /** 1 = highest average; ties keep the fixed function order. */
  rank: number;
  strongest: boolean;
  opportunity: boolean;
}

export interface EaBufferDerived {
  noCurrentEa: boolean;
  functions: BufferFunctionResult[];
  /** Function ids shown in each of the three snapshot sections, already in
   * display order (score order, ties in the fixed function order). */
  strongestIds: string[];
  needsIds: string[];
  opportunityIds: string[];
  allStrong: boolean;
}

/** Spec section 7: classification uses the exact calculated score. */
export function classifyBufferScore(score: number, rules: EaBufferRules): BufferClassId {
  if (score >= rules.strongMin) return "strong";
  if (score >= rules.developingMin) return "developing";
  return "underdeveloped";
}

export function missingEaBufferFields(config: EaBufferConfig, answers: EaBufferAnswers): string[] {
  // Selecting "I do not currently have an EA" ends the assessment at once.
  if (answers.noCurrentEa) return [];
  const missing: string[] = [];
  for (const q of config.contextQuestions) {
    if (!answers.context?.[q.id]) missing.push(`context.${q.id}`);
  }
  for (const fn of config.functions) {
    for (const r of fn.responsibilities) {
      const v = answers.ownership?.[r.id];
      if (typeof v !== "number" || v < 0 || v > 4) missing.push(r.id);
    }
  }
  return missing;
}

/** Spec 8.4 selection rules. Scores are multiples of 0.25 so equality on the
 * float values is exact. `order` is each function's index in the fixed order
 * Capture, Hold, Sequence, Activate, Escalate, used for every tie. */
export function scoreEaBuffer(config: EaBufferConfig, answers: EaBufferAnswers): EaBufferDerived {
  if (answers.noCurrentEa) {
    return { noCurrentEa: true, functions: [], strongestIds: [], needsIds: [], opportunityIds: [], allStrong: false };
  }
  const rules = bufferRules(config);
  const base = config.functions.map((fn, order) => {
    const values = fn.responsibilities.map((r) => answers.ownership?.[r.id] ?? 0);
    const average = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    return { fn, order, values, average };
  });

  const byScoreDesc = [...base].sort((a, b) => b.average - a.average || a.order - b.order);
  const byScoreAsc = [...base].sort((a, b) => a.average - b.average || a.order - b.order);
  const rank = new Map(byScoreDesc.map((b, i) => [b.fn.id, i + 1]));

  // Strongest: every Strong function; otherwise the highest-scoring (or tied) ones.
  let strong = byScoreDesc.filter((b) => classifyBufferScore(b.average, rules) === "strong");
  if (strong.length === 0) {
    const top = byScoreDesc[0]?.average;
    strong = byScoreDesc.filter((b) => b.average === top);
  }

  // Needs strengthening: every Underdeveloped function; otherwise the lowest (or tied) ones.
  let needs = byScoreAsc.filter((b) => classifyBufferScore(b.average, rules) === "underdeveloped");
  if (needs.length === 0) {
    const low = byScoreAsc[0]?.average;
    needs = byScoreAsc.filter((b) => b.average === low);
  }

  // Greatest opportunity: the two lowest-scoring functions, plus everything
  // tied at the second-lowest score (all five when every score is identical).
  const secondLowest = byScoreAsc[Math.min(1, byScoreAsc.length - 1)]?.average;
  const opportunity = byScoreAsc.filter((b) => b.average <= secondLowest);

  const ids = (list: typeof base) => list.map((b) => b.fn.id);
  const strongestIds = ids(strong);
  const opportunityIds = ids(opportunity);
  const functions: BufferFunctionResult[] = base.map((b) => ({
    id: b.fn.id,
    name: b.fn.name,
    values: b.values,
    responsibilityIds: b.fn.responsibilities.map((r) => r.id),
    average: b.average,
    classification: classifyBufferScore(b.average, rules),
    rank: rank.get(b.fn.id) ?? 0,
    strongest: strongestIds.includes(b.fn.id),
    opportunity: opportunityIds.includes(b.fn.id),
  }));

  return {
    noCurrentEa: false,
    functions,
    strongestIds,
    needsIds: ids(needs),
    opportunityIds,
    allStrong: functions.length > 0 && functions.every((f) => f.classification === "strong"),
  };
}
