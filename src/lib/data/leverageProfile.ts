import "server-only";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildConstraintCards, type ConstraintCard } from "@/lib/leverageProfileCards";

const ASSESSMENT_KEY = "executive_leverage_diagnostic";

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** The participant's "Leverage constraints" cards, built from the version of
 * the diagnostic THEY completed (via their result row), so editing the
 * questionnaire later never reshuffles or relabels a finished profile. Only
 * the selected answers' positions are used -- never any internal score. */
export async function loadConstraintCards(supabase: Supabase, participantSessionId: string): Promise<ConstraintCard[]> {
  const { data: resultRow } = await supabase
    .from("assessment_results")
    .select("assessment_id, assessments!inner(key)")
    .eq("participant_session_id", participantSessionId)
    .eq("assessments.key", ASSESSMENT_KEY)
    .maybeSingle();
  if (!resultRow) return [];

  const [{ data: questions }, { data: responses }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, prompt, sort_order, active, answer_options(value, label, sort_order, active)")
      .eq("assessment_id", resultRow.assessment_id)
      .order("sort_order"),
    supabase.from("responses").select("question_id, answer").eq("participant_session_id", participantSessionId),
  ]);

  const answerByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r.answer]));
  return buildConstraintCards(
    (questions ?? [])
      .filter((q) => q.active)
      .map((q) => ({
        prompt: q.prompt,
        options: (q.answer_options ?? [])
          .filter((o) => o.active)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((o) => ({ value: o.value, label: o.label })),
        answer: answerByQuestion.get(q.id) ?? null,
      })),
  );
}
