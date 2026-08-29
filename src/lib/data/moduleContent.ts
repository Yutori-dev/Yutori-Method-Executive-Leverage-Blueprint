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

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, name, is_placeholder, active")
    .eq("key", assessmentKey)
    .eq("active", true)
    .maybeSingle();

  if (!assessment || !assessment.is_placeholder) return null;

  const { data: questions } = await supabase
    .from("questions")
    .select("id, prompt, type, config, required, sort_order")
    .eq("assessment_id", assessment.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (!questions) return null;

  const questionIds = questions.map((q) => q.id);

  const [{ data: options }, { data: responses }] = await Promise.all([
    supabase
      .from("answer_options")
      .select("id, question_id, label, value, sort_order")
      .in("question_id", questionIds)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("responses")
      .select("question_id, answer")
      .eq("participant_session_id", participantSessionId)
      .in("question_id", questionIds),
  ]);

  const answerByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r.answer]));

  return {
    assessmentName: assessment.name,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      type: q.type as QuestionType,
      config: (q.config as Record<string, unknown>) ?? {},
      required: q.required,
      options: (options ?? [])
        .filter((o) => o.question_id === q.id)
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
