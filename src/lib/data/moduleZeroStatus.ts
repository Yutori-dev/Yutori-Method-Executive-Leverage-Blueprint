import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isProduction } from "@/lib/env";

/** Whether the participant has answered every required Module 0 /
 * Executive Context question. Module 0 isn't one of the seven dashboard
 * modules and has no progress row of its own -- completion is inferred
 * from whether required responses exist, same technique used for
 * required-question gating everywhere else in the app. */
export async function hasCompletedExecutiveContext(participantSessionId: string): Promise<boolean> {
  if (isProduction) return true; // nothing to gate on -- the placeholder content is hidden entirely.

  const supabase = await createServerSupabaseClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("key", "dev_demo_module_0_context")
    .eq("active", true)
    .maybeSingle();

  if (!assessment) return true;

  const { data: requiredQuestions } = await supabase
    .from("questions")
    .select("id")
    .eq("assessment_id", assessment.id)
    .eq("required", true)
    .eq("active", true);

  if (!requiredQuestions || requiredQuestions.length === 0) return true;

  const { data: responses } = await supabase
    .from("responses")
    .select("question_id")
    .eq("participant_session_id", participantSessionId)
    .in(
      "question_id",
      requiredQuestions.map((q) => q.id),
    );

  return (responses?.length ?? 0) >= requiredQuestions.length;
}
