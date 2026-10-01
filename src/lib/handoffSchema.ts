/** High-Leverage Handoff config + answer shapes (see the migration). */
export type HandoffStepKind = "text" | "trap_select" | "commitment_multi" | "mechanism_multi";

export interface HandoffStep {
  id: string;
  kind: HandoffStepKind;
  title: string;
  prompt: string;
  helper: string[];
  example?: string;
  options?: string[];
  cta?: string;
}

export interface HandoffConfig {
  intro: { title: string; body: string[]; cta: string };
  steps: HandoffStep[];
  review: { title: string; closing: string[] };
}

export interface HandoffAnswers {
  opportunity?: string;
  today?: string;
  shift90?: string;
  success?: string;
  /** Trap display name, exactly as the Thinking Traps module shows it. */
  trap?: string;
  /** Entries like "START: I will ..." so the category travels with the text. */
  commitments?: string[];
  mechanisms?: string[];
  mechanismOther?: string;
  firstConversation?: string;
  d30?: string;
  d90?: string;
}

export interface HandoffContext {
  /** Trap names for screen 6 (the participant's own results). */
  trapOptions: string[];
  /** "START: ..." style entries for screen 7. */
  commitmentOptions: string[];
}

/** Whether a step has a usable answer. Only the "Other" text is optional. */
export function isHandoffStepAnswered(step: HandoffStep, answers: HandoffAnswers): boolean {
  const value = answers[step.id as keyof HandoffAnswers];
  if (step.kind === "commitment_multi" || step.kind === "mechanism_multi") {
    return Array.isArray(value) && value.length > 0;
  }
  return typeof value === "string" && value.trim().length > 0;
}

export function firstUnansweredHandoffStep(config: HandoffConfig, answers: HandoffAnswers): number {
  const i = config.steps.findIndex((s) => !isHandoffStepAnswered(s, answers));
  return i === -1 ? config.steps.length : i;
}
