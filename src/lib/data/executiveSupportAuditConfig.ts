import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel } from "@/types/database";
import type {
  ExecutiveSupportAuditConfigInput,
  ExecutiveSupportAuditQuestionInput,
} from "@/lib/actions/executiveSupportAuditConfig";

/** Full editable shape for the admin config screen -- distinct from
 * src/lib/data/executiveSupportAudit.ts's getExecutiveSupportAuditData,
 * which is participant-scoped. This loader has no participant context,
 * just the latest active content. */
export async function getExecutiveSupportAuditConfigForEditing(): Promise<ExecutiveSupportAuditConfigInput> {
  const supabase = await createServerSupabaseClient();

  const { data: config } = await supabase
    .from("executive_support_audit_config")
    .select(
      "id, intro_header, intro_subheader, intro_body, results_intro_copy, execution_primary_copy, orchestration_primary_copy, strategic_primary_copy, systems_primary_copy, execution_secondary_copy, orchestration_secondary_copy, strategic_secondary_copy, systems_secondary_copy, no_secondary_copy, secondary_threshold",
    )
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!config) {
    throw new Error("No active Executive Support Audit config found.");
  }

  const { data: questions } = await supabase
    .from("executive_support_audit_questions")
    .select("sort_order, prompt, option_execution, option_orchestration, option_strategic, option_systems")
    .eq("config_id", config.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const primaryCopy: Record<LeverageLevel, string> = {
    execution: config.execution_primary_copy,
    orchestration: config.orchestration_primary_copy,
    strategic: config.strategic_primary_copy,
    systems: config.systems_primary_copy,
  };
  const secondaryCopy: Record<LeverageLevel, string> = {
    execution: config.execution_secondary_copy,
    orchestration: config.orchestration_secondary_copy,
    strategic: config.strategic_secondary_copy,
    systems: config.systems_secondary_copy,
  };

  const questionInputs: ExecutiveSupportAuditQuestionInput[] = (questions ?? []).map((q) => ({
    sortOrder: q.sort_order,
    prompt: q.prompt,
    options: {
      execution: q.option_execution,
      orchestration: q.option_orchestration,
      strategic: q.option_strategic,
      systems: q.option_systems,
    },
  }));

  return {
    introHeader: config.intro_header,
    introSubheader: config.intro_subheader,
    introBody: config.intro_body,
    resultsIntroCopy: config.results_intro_copy,
    primaryCopy,
    secondaryCopy,
    noSecondaryCopy: config.no_secondary_copy,
    secondaryThreshold: config.secondary_threshold,
    questions: questionInputs,
  };
}
