import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { QuestionType } from "@/types/database";
import type { DemoAssessment } from "./moduleContent";

const ASSESSMENT_KEY = "executive_leverage_diagnostic";

export interface ExecutiveLeverageProfileResult {
  profileLabel: string;
  profileDescription: string | null;
  strongestConstraints: { label: string; interpretation: string }[];
}

export interface ExecutiveLeverageDiagnosticData {
  assessment: DemoAssessment | null;
  result: ExecutiveLeverageProfileResult | null;
}

/**
 * Real, approved content -- deliberately NOT built on getDemoAssessmentByKey
 * in moduleContent.ts, which is intentionally double-guarded (isProduction
 * + is_placeholder) to never return content in production. That guard must
 * stay airtight, so this is a separate loader for is_placeholder = false
 * content instead of a flag that would weaken it.
 *
 * Never selects total_points/internal_percentage -- "do not display
 * numeric score" is enforced by what this loader is capable of returning,
 * not just by what a component chooses to render.
 */
export async function getExecutiveLeverageDiagnosticData(
  participantSessionId: string,
): Promise<ExecutiveLeverageDiagnosticData> {
  const supabase = await createServerSupabaseClient();

  const [{ data: assessment }, { data: responses }, { data: resultRow }] = await Promise.all([
    supabase
      .from("assessments")
      .select(
        "id, name, is_placeholder, active, questions(id, prompt, type, config, required, sort_order, active, answer_options(id, label, value, sort_order, active))",
      )
      .eq("key", ASSESSMENT_KEY)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("responses")
      .select("question_id, answer")
      .eq("participant_session_id", participantSessionId),
    supabase
      .from("assessment_results")
      .select("overall_result, interpretation, strongest_constraints, assessments!inner(key)")
      .eq("participant_session_id", participantSessionId)
      .eq("assessments.key", ASSESSMENT_KEY)
      .maybeSingle(),
  ]);

  if (!assessment || assessment.is_placeholder) {
    return { assessment: null, result: null };
  }

  const answerByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r.answer]));

  const questions = (assessment.questions ?? [])
    .filter((q) => q.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const demoAssessment: DemoAssessment = {
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

  const result: ExecutiveLeverageProfileResult | null =
    resultRow && resultRow.overall_result
      ? {
          profileLabel: resultRow.overall_result,
          profileDescription: resultRow.interpretation,
          strongestConstraints:
            (resultRow.strongest_constraints as { label: string; interpretation: string }[] | null) ?? [],
        }
      : null;

  return { assessment: demoAssessment, result };
}
