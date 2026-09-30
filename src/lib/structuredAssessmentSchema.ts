import type { Json } from "@/types/database";

/**
 * Config-driven engine for the six new modules (see
 * 20260930000001_structured_assessments_foundation.sql for why one engine
 * instead of six bespoke schemas). This file only knows the EA Experience
 * Assessment's question types so far -- matrix/single_select/multi_select/
 * short_text/email -- the remaining five modules' scoring/branching/dyad
 * logic is added incrementally as each is built, not assumed here.
 *
 * Deliberately not `server-only`: the types and pure validation functions
 * here are needed client-side too (StructuredAssessmentFlow's submit-button
 * check), so this file holds only shape + pure logic. The actual Supabase
 * read lives in data/structuredAssessments.ts, which is server-only.
 */

export type QuestionType = "short_text" | "email" | "single_select" | "multi_select" | "matrix";

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  required: boolean;
  instruction?: string;
}
export interface SingleSelectQuestion extends BaseQuestion {
  type: "single_select";
  options: string[];
}
export interface MultiSelectOption {
  id: string;
  label: string;
}
export interface MultiSelectQuestion extends BaseQuestion {
  type: "multi_select";
  options: MultiSelectOption[];
  min?: number;
  max?: number;
  otherOptionId?: string;
  otherPrompt?: string;
}
export interface MatrixRow {
  id: string;
  label: string;
  description?: string;
}
export interface MatrixQuestion extends BaseQuestion {
  type: "matrix";
  options: string[];
  rows: MatrixRow[];
}
export type TextQuestion = BaseQuestion & { type: "short_text" | "email" };

export type StructuredQuestion = SingleSelectQuestion | MultiSelectQuestion | MatrixQuestion | TextQuestion;

export interface StructuredAssessmentConfig {
  intro: { title: string | null; body: string[] };
  completion_message: string;
  questions: StructuredQuestion[];
}

/** A question is answered when it has a non-empty value -- used both
 * client-side (submit button) and server-side (the write path) is the one
 * place that decides what "empty" means per question type, so the two
 * can't drift. */
export function isQuestionAnswered(question: StructuredQuestion, answers: Record<string, Json>): boolean {
  const value = answers[question.id];
  if (question.type === "multi_select") return Array.isArray(value) && value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

export function missingRequiredQuestions(
  config: StructuredAssessmentConfig,
  answers: Record<string, Json>,
): string[] {
  const missing: string[] = [];
  for (const q of config.questions) {
    if (!q.required) continue;
    if (q.type === "matrix") {
      for (const row of q.rows) {
        const rowAnswers = (answers[q.id] as Record<string, Json> | undefined) ?? {};
        if (rowAnswers[row.id] === undefined || rowAnswers[row.id] === null) missing.push(`${q.id}.${row.id}`);
      }
      continue;
    }
    if (!isQuestionAnswered(q, answers)) {
      missing.push(q.id);
      continue;
    }
    // Q14's "Other" acceptance criteria: the free-text field is required
    // only once "Other" is actually selected, stored under a synthetic
    // `${questionId}__other` key alongside the selection array.
    if (q.type === "multi_select" && q.otherOptionId) {
      const selected = (answers[q.id] as string[] | undefined) ?? [];
      if (selected.includes(q.otherOptionId)) {
        const otherText = answers[`${q.id}__other`];
        if (typeof otherText !== "string" || otherText.trim().length === 0) missing.push(`${q.id}__other`);
      }
    }
  }
  return missing;
}
