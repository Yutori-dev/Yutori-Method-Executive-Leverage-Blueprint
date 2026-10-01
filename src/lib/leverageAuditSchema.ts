/**
 * EA Leverage & Orchestration Audit -- shared shape for both the Visionary
 * and EA versions of the spec. The two specs are the same instrument asked
 * from opposite sides of the same relationship (same 15 responsibilities,
 * same 0-4/-1-0-1 scales, same classification math) with different copy
 * and a different context-question count -- one config type, a `variant`
 * field selects which copy set and behavior applies, rather than two
 * parallel schemas that would drift.
 *
 * Internal derived-field names (e.g. cos_high_ownership) are this app's
 * own naming, not the spec's literal "chief_of_staff_territory" /
 * "above_and_beyond_ea_scope" strings -- both specs' COS classifications
 * are numerically identical (Current Ownership 3-4, optionally + Desired
 * Direction +1), only the participant-facing label differs by variant, so
 * one derived shape serves both instead of two structurally-identical
 * ones under different key names.
 */

export type AuditVariant = "visionary" | "ea";

export interface ContextQuestionOption {
  value: string;
  label: string;
}
export interface ContextQuestion {
  id: string;
  prompt: string;
  options: ContextQuestionOption[];
  /** Visionary tenure question only: selecting this option value ends the
   * assessment immediately (spec section 2's branching). */
  exitOnValue?: string;
}

export interface OwnershipLevel {
  value: 0 | 1 | 2 | 3 | 4;
  label: string;
  description: string;
}

export interface DirectionOption {
  value: -1 | 0 | 1;
  label: string;
}

export interface ResponsibilityItem {
  id: string;
  type: "EA" | "COS";
  name: string;
  description: string;
  /** EA01-12 only; null for COS01-03 (spec: macro categories never apply
   * to COS items). */
  macroCategory: string | null;
}

export interface MacroCategory {
  id: string;
  name: string;
}

export interface LeverageAuditConfig {
  variant: AuditVariant;
  intro: { title: string; body: string[] };
  contextQuestions: ContextQuestion[];
  exitMessage: string;
  ownershipLevels: OwnershipLevel[];
  directionOptions: DirectionOption[];
  responsibilities: ResponsibilityItem[];
  macroCategories: MacroCategory[];
  resultHeading: string;
  sectionA: { heading: string; intro: string };
  sectionB: { heading: string; intro: string };
  sectionC: { heading: string; intro: string; reactionPrefix: string; closing: string };
}

export interface LeverageAuditAnswers {
  context: Record<string, string>;
  /** Keyed by responsibility id -> {current: 0-4, desired: -1|0|1}. */
  responses: Record<string, { current?: 0 | 1 | 2 | 3 | 4; desired?: -1 | 0 | 1 }>;
  noCurrentEa?: boolean;
}

export interface LeverageAuditDerived {
  noCurrentEa: boolean;
  /** Per-EA-responsibility (EA01-12) classification. */
  ea: Record<string, { greaterLeverageOpportunity: boolean; appropriatelySupported: boolean }>;
  /** Per-COS-responsibility (COS01-03) classification. */
  cos: Record<string, { highOwnership: boolean; growingOwnership: boolean; highOwnershipAndMoreDesired: boolean }>;
  dyadId: string | null;
  associatedExecutiveParticipantSessionId: string | null;
}

/** Spec sections 6A/6B (EA) and 6C/D/E (COS), identical math for both
 * variants -- only the participant-facing labels differ. */
export function classifyLeverageAudit(
  config: LeverageAuditConfig,
  answers: LeverageAuditAnswers,
): LeverageAuditDerived {
  const ea: LeverageAuditDerived["ea"] = {};
  const cos: LeverageAuditDerived["cos"] = {};

  const responses = answers.responses ?? {};
  for (const r of config.responsibilities) {
    const response = responses[r.id];
    if (!response || response.current === undefined || response.desired === undefined) continue;
    const { current, desired } = response;

    if (r.type === "EA") {
      ea[r.id] = {
        greaterLeverageOpportunity: current <= 2 && desired === 1,
        appropriatelySupported: current >= 3 && desired === 0,
      };
    } else {
      cos[r.id] = {
        highOwnership: current >= 3,
        growingOwnership: current <= 2 && desired === 1,
        highOwnershipAndMoreDesired: current >= 3 && desired === 1,
      };
    }
  }

  return { noCurrentEa: answers.noCurrentEa ?? false, ea, cos, dyadId: null, associatedExecutiveParticipantSessionId: null };
}

export function missingLeverageAuditFields(
  config: LeverageAuditConfig,
  answers: LeverageAuditAnswers,
): string[] {
  // Branching exit: selecting "I do not currently have an EA" ends the
  // assessment immediately (spec section 2) -- nothing else, including the
  // second context question, is required.
  if (answers.noCurrentEa) return [];

  const context = answers.context ?? {};
  const responses = answers.responses ?? {};
  const missing: string[] = [];
  for (const q of config.contextQuestions) {
    if (!context[q.id]) missing.push(`context.${q.id}`);
  }
  for (const r of config.responsibilities) {
    const response = responses[r.id];
    if (!response || response.current === undefined) missing.push(`${r.id}.current`);
    if (!response || response.desired === undefined) missing.push(`${r.id}.desired`);
  }
  return missing;
}
