import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isProduction } from "@/lib/env";
import type { QuestionType } from "@/types/database";

export interface DemoQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  config: Record<string, unknown>;
  required: boolean;
  options: { id: string; label: string; value: string }[];
  existingAnswer: unknown;
}

export interface DemoAssessment {
  assessmentName: string;
  questions: DemoQuestion[];
}

/**
 * Loads a placeholder assessment by key for autosave-driven rendering.
 * Hard-guarded against production regardless of caller: a placeholder
 * assessment must never reach a real participant even if seed data somehow
 * ended up there (task instructions section 14).
 *
 * Used by both the Operating Altitude demo (Milestone 1) and the
 * Delegation Beliefs demo (Milestone 2) -- the assessment key, not the
 * module, decides what renders, matching the decoupled activity-engine
 * design from Milestone 1 (docs/ARCHITECTURE_DECISIONS.md).
 */
export async function getDemoAssessmentByKey(
  assessmentKey: string,
  participantSessionId: string,
): Promise<DemoAssessment | null> {
  if (isProduction) return null;

  const supabase = await createServerSupabaseClient();

  // Assessment, its questions, and their answer options all come back in a
  // single request via nested embeds instead of three separate queries.
  // Only the participant's own responses aren't part of that relationship
  // tree, so they're a second request -- run in parallel rather than
  // waiting on the first, since neither depends on the other's result
  // (filtering to the right question ids happens in JS below instead).
  const [{ data: assessment }, { data: responses }] = await Promise.all([
    supabase
      .from("assessments")
      .select(
        "id, name, is_placeholder, active, questions(id, prompt, type, config, required, sort_order, active, answer_options(id, label, value, sort_order, active))",
      )
      .eq("key", assessmentKey)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("responses")
      .select("question_id, answer")
      .eq("participant_session_id", participantSessionId),
  ]);

  if (!assessment || !assessment.is_placeholder) return null;

  const answerByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r.answer]));

  const questions = (assessment.questions ?? [])
    .filter((q) => q.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    assessmentName: assessment.name,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      type: q.type as QuestionType,
      config: (q.config as Record<string, unknown>) ?? {},
      required: q.required,
      options: (q.answer_options ?? [])
        .filter((o) => o.active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ id: o.id, label: o.label, value: o.value })),
      existingAnswer: answerByQuestion.get(q.id) ?? null,
    })),
  };
}

const MODULE_ASSESSMENT_KEYS: Record<string, string> = {
  operating_altitude: "dev_demo_operating_altitude",
};

/**
 * Convenience wrapper for the simple case of "this module has exactly one
 * demo assessment" (Operating Altitude). The Delegation module (Milestone 2)
 * calls getDemoAssessmentByKey("dev_demo_delegation_beliefs", ...) directly
 * alongside the Zone of Investment data instead of going through this
 * module-key lookup, since it's composed with other sections on the page.
 */
export async function getDemoAssessment(
  moduleKey: string,
  participantSessionId: string,
): Promise<DemoAssessment | null> {
  const assessmentKey = MODULE_ASSESSMENT_KEYS[moduleKey];
  if (!assessmentKey) return null;
  return getDemoAssessmentByKey(assessmentKey, participantSessionId);
}
