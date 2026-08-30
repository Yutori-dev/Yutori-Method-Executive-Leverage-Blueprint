import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";

const COLUMNS = [
  "results_header",
  "audit_only_intro",
  "multi_layer_intro",
  "leading_need_header",
  "leading_need_body",
  "secondary_need_header",
  "systems_amplifier_prepend",
  "corroboration_strong_header",
  "corroboration_strong_body",
  "what_this_means_execution",
  "what_this_means_orchestration",
  "what_this_means_strategic",
  "what_this_means_systems",
  "strengthen_execution_copy",
  "add_execution_copy",
  "strengthen_orchestration_copy",
  "evolve_or_add_orchestration_copy",
  "add_orchestration_copy",
  "strengthen_strategic_copy",
  "add_strategic_from_orchestration_copy",
  "add_strategic_copy",
  "strengthen_systems_copy",
  "add_systems_copy",
] as const;

/** Full editable shape for the admin config screen. Participant-scoped
 * consumption resolves copy inline in the participant/Blueprint components
 * from ArchitectureData + this same config, rather than a separate summary
 * helper -- the architecture result's shape is simpler than the Audit's
 * (no per-participant question/response set to also fetch). */
export async function getExecutiveSupportArchitectureConfigForEditing(): Promise<ExecutiveSupportArchitectureConfigInput> {
  const supabase = await createServerSupabaseClient();

  const { data: config } = await supabase
    .from("executive_support_architecture_config")
    .select(COLUMNS.join(", "))
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<Record<(typeof COLUMNS)[number], string>>();

  if (!config) {
    throw new Error("No active Executive Support Architecture config found.");
  }

  return {
    resultsHeader: config.results_header,
    auditOnlyIntro: config.audit_only_intro,
    multiLayerIntro: config.multi_layer_intro,
    leadingNeedHeader: config.leading_need_header,
    leadingNeedBody: config.leading_need_body,
    secondaryNeedHeader: config.secondary_need_header,
    systemsAmplifierPrepend: config.systems_amplifier_prepend,
    corroborationStrongHeader: config.corroboration_strong_header,
    corroborationStrongBody: config.corroboration_strong_body,
    whatThisMeansExecution: config.what_this_means_execution,
    whatThisMeansOrchestration: config.what_this_means_orchestration,
    whatThisMeansStrategic: config.what_this_means_strategic,
    whatThisMeansSystems: config.what_this_means_systems,
    strengthenExecutionCopy: config.strengthen_execution_copy,
    addExecutionCopy: config.add_execution_copy,
    strengthenOrchestrationCopy: config.strengthen_orchestration_copy,
    evolveOrAddOrchestrationCopy: config.evolve_or_add_orchestration_copy,
    addOrchestrationCopy: config.add_orchestration_copy,
    strengthenStrategicCopy: config.strengthen_strategic_copy,
    addStrategicFromOrchestrationCopy: config.add_strategic_from_orchestration_copy,
    addStrategicCopy: config.add_strategic_copy,
    strengthenSystemsCopy: config.strengthen_systems_copy,
    addSystemsCopy: config.add_systems_copy,
  };
}

/** Loader for participant-facing consumption (ArchitectureFlow, Blueprint) --
 * same content, no "for editing" framing needed since it's read-only there. */
export async function getExecutiveSupportArchitectureConfig(): Promise<ExecutiveSupportArchitectureConfigInput | null> {
  const supabase = await createServerSupabaseClient();
  const { data: config } = await supabase
    .from("executive_support_architecture_config")
    .select(COLUMNS.join(", "))
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<Record<(typeof COLUMNS)[number], string>>();

  if (!config) return null;

  return {
    resultsHeader: config.results_header,
    auditOnlyIntro: config.audit_only_intro,
    multiLayerIntro: config.multi_layer_intro,
    leadingNeedHeader: config.leading_need_header,
    leadingNeedBody: config.leading_need_body,
    secondaryNeedHeader: config.secondary_need_header,
    systemsAmplifierPrepend: config.systems_amplifier_prepend,
    corroborationStrongHeader: config.corroboration_strong_header,
    corroborationStrongBody: config.corroboration_strong_body,
    whatThisMeansExecution: config.what_this_means_execution,
    whatThisMeansOrchestration: config.what_this_means_orchestration,
    whatThisMeansStrategic: config.what_this_means_strategic,
    whatThisMeansSystems: config.what_this_means_systems,
    strengthenExecutionCopy: config.strengthen_execution_copy,
    addExecutionCopy: config.add_execution_copy,
    strengthenOrchestrationCopy: config.strengthen_orchestration_copy,
    evolveOrAddOrchestrationCopy: config.evolve_or_add_orchestration_copy,
    addOrchestrationCopy: config.add_orchestration_copy,
    strengthenStrategicCopy: config.strengthen_strategic_copy,
    addStrategicFromOrchestrationCopy: config.add_strategic_from_orchestration_copy,
    addStrategicCopy: config.add_strategic_copy,
    strengthenSystemsCopy: config.strengthen_systems_copy,
    addSystemsCopy: config.add_systems_copy,
  };
}
