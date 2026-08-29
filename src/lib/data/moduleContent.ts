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
 * The only module wired to the configurable activity engine in Milestone 1
 * -- it exists to demonstrate the engine and the autosave/persistence
 * pattern end to end (task instructions sections 11/14), not as real Yutori
 * content. Every other module renders GenericPlaceholderModule instead.
 *
 * Hard-guarded against production: a placeholder assessment must never
 * reach a real participant even if seed data somehow ended up there.
 */
const DEMO_MODULE_KEY = "operating_altitude";
const DEMO_ASSESSMENT_KEY = "dev_demo_operating_altitude";

export async function getDemoAssessment(
  moduleKey: string,
  participantSessionId: string,
): Promise<DemoAssessment | null> {
  if (isProduction || moduleKey !== DEMO_MODULE_KEY) return null;

  const supabase = await createServerSupabaseClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, name, is_placeholder, active")
    .eq("key", DEMO_ASSESSMENT_KEY)
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
      type: q.type,
      config: (q.config as Record<string, unknown>) ?? {},
      required: q.required,
      options: (options ?? [])
        .filter((o) => o.question_id === q.id)
        .map((o) => ({ id: o.id, label: o.label, value: o.value })),
      existingAnswer: answerByQuestion.get(q.id) ?? null,
    })),
  };
}
