/**
 * Executive Leverage Profile -- "Leverage constraints" cards (client guide,
 * Display and severity rules). A pure display classification over the
 * participant's own selected answers: it never reads or replaces the
 * existing scoring, and several existing scores run in the opposite
 * direction, so severity comes from the answer's POSITION in the questionnaire
 * (one-based, as shown to participants), not from any internal score.
 *
 *   position 1, 2 -> no card      3 -> Moderate    4 -> High    5 -> Very high
 *
 * Questions are recognised by their exact original wording (the guide's
 * "question identifier / original wording" column), not by database row order
 * or abbreviated titles, so reordering or editing rows can never put a title
 * on the wrong question -- an unrecognised question simply gets no card.
 */

export type ConstraintLevel = "very_high" | "high" | "moderate";

export interface ConstraintCard {
  /** Questionnaire number (1-15), used only to keep the original order. */
  number: number;
  title: string;
  /** The participant's exact selected answer text. */
  answer: string;
  level: ConstraintLevel;
}

export const CONSTRAINT_LEVEL_ORDER: ConstraintLevel[] = ["very_high", "high", "moderate"];
export const CONSTRAINT_LEVEL_LABEL: Record<ConstraintLevel, string> = {
  very_high: "Very high constraint",
  high: "High constraint",
  moderate: "Moderate constraint",
};

export const PROFILE_CARD_QUESTIONS: { number: number; prompt: string; title: string }[] = [
  { number: 1, prompt: "Thinking across your life as a whole, how would you describe your current capacity?", title: "Your capacity across work and life" },
  { number: 2, prompt: "In a typical week, how much of your professional time is spent personally completing administrative, coordination or routine execution work?", title: "Weekly time on admin and routine work" },
  { number: 3, prompt: "In a typical week, how often do you personally complete work because doing it yourself feels faster or easier than getting someone else to own it?", title: "Doing it yourself because it feels easier" },
  { number: 4, prompt: "How much of the scheduling and calendar coordination surrounding your professional commitments still requires your personal involvement?", title: "Scheduling that still depends on you" },
  { number: 5, prompt: "In a typical week, how often are you personally managing logistics surrounding meetings, travel, events or other professional commitments?", title: "Handling meeting, travel and event logistics" },
  { number: 6, prompt: "In a typical week, how often are you personally responsible for making sure commitments, decisions or next steps get followed through to completion?", title: "Making sure things get done" },
  { number: 7, prompt: "How much of the information and context required to keep work moving lives primarily with you rather than with the appropriate people or systems?", title: "Information that lives mainly with you" },
  { number: 8, prompt: "Approximately what percentage of recurring processes, workflows and ways of working are documented well enough for others to execute without relying on you?", title: "Processes others can follow without you" },
  { number: 9, prompt: "In a typical week, how often does meaningful work slow down or stop because a decision, approval or answer is waiting on you?", title: "Work held up waiting for you" },
  { number: 10, prompt: "Of the decisions that reach you, how many genuinely require your judgment, authority or unique context?", title: "Decisions that truly need you" },
  { number: 11, prompt: "In a typical week, how often are you pulled into operational issues that someone else could reasonably resolve without you?", title: "Solving issues others could handle" },
  { number: 12, prompt: "Over the last two quarters, approximately what percentage of your organization's major quarterly priorities or Rocks were completed as committed?", title: "Quarterly priorities completed as promised" },
  { number: 13, prompt: "In a typical week, approximately how much of your professional capacity is available for work where your specific contribution creates disproportionate value - vision, strategy, growth, innovation, key relationships or other work that truly requires you?", title: "Capacity for your highest-value work" },
  { number: 14, prompt: "In a typical week, approximately how many hours do you spend in internal meetings primarily focused on status updates, coordination, planning or routine operating matters?", title: "Weekly hours in routine internal meetings" },
  { number: 15, prompt: "How confident are you that important messages, requests and follow-ups reach your attention at the right time without requiring you to personally monitor your inbox and other communication channels?", title: "Confidence important messages reach you on time" },
];

/** Dash/quote/spacing differences must not break the match. */
export function normalizePrompt(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
const CARD_BY_PROMPT = new Map(PROFILE_CARD_QUESTIONS.map((q) => [normalizePrompt(q.prompt), q]));

/** One-based answer position -> severity; positions 1-2 (and anything
 * unexpected) show no card. */
export function constraintLevelForPosition(position: number): ConstraintLevel | null {
  if (position === 3) return "moderate";
  if (position === 4) return "high";
  if (position === 5) return "very_high";
  return null;
}

export interface ProfileQuestionInput {
  prompt: string;
  /** Active options in the order shown to participants. */
  options: { value: string; label: string }[];
  /** The stored answer (an option value), or null when unanswered. */
  answer: unknown;
}

/** Cards for every response in the moderate/high/very-high range, grouped
 * Very high -> High -> Moderate, original questionnaire order inside each
 * group. Missing answers are never treated as low constraints. */
export function buildConstraintCards(questions: ProfileQuestionInput[]): ConstraintCard[] {
  const cards: ConstraintCard[] = [];
  for (const q of questions) {
    const meta = CARD_BY_PROMPT.get(normalizePrompt(q.prompt));
    if (!meta || typeof q.answer !== "string") continue;
    const index = q.options.findIndex((o) => o.value === q.answer);
    if (index === -1) continue;
    const level = constraintLevelForPosition(index + 1);
    if (!level) continue;
    cards.push({ number: meta.number, title: meta.title, answer: q.options[index].label, level });
  }
  const rank = (l: ConstraintLevel) => CONSTRAINT_LEVEL_ORDER.indexOf(l);
  return cards.sort((a, b) => rank(a.level) - rank(b.level) || a.number - b.number);
}
