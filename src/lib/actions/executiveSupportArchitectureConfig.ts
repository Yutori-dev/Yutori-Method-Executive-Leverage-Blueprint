"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ExecutiveSupportArchitectureConfigInput {
  resultsHeader: string;
  auditOnlyIntro: string;
  multiLayerIntro: string;
  leadingNeedHeader: string;
  leadingNeedBody: string;
  secondaryNeedHeader: string;
  systemsAmplifierPrepend: string;
  corroborationStrongHeader: string;
  corroborationStrongBody: string;
  whatThisMeansExecution: string;
  whatThisMeansOrchestration: string;
  whatThisMeansStrategic: string;
  whatThisMeansSystems: string;
  strengthenExecutionCopy: string;
  addExecutionCopy: string;
  strengthenOrchestrationCopy: string;
  evolveOrAddOrchestrationCopy: string;
  addOrchestrationCopy: string;
  strengthenStrategicCopy: string;
  addStrategicFromOrchestrationCopy: string;
  addStrategicCopy: string;
  strengthenSystemsCopy: string;
  addSystemsCopy: string;
}

/** Saves as a brand-new config version, same convention as every other
 * activity's config. The branching logic itself is hardcoded in
 * calculate_executive_support_architecture -- this is copy only. */
export async function saveExecutiveSupportArchitectureConfigVersion(
  input: ExecutiveSupportArchitectureConfigInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data: latest, error: latestError } = await supabase
    .from("executive_support_architecture_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { ok: false as const, message: latestError.message };

  const nextVersion = (latest?.version ?? 0) + 1;

  const { error } = await supabase.from("executive_support_architecture_config").insert({
    version: nextVersion,
    active: true,
    results_header: input.resultsHeader,
    audit_only_intro: input.auditOnlyIntro,
    multi_layer_intro: input.multiLayerIntro,
    leading_need_header: input.leadingNeedHeader,
    leading_need_body: input.leadingNeedBody,
    secondary_need_header: input.secondaryNeedHeader,
    systems_amplifier_prepend: input.systemsAmplifierPrepend,
    corroboration_strong_header: input.corroborationStrongHeader,
    corroboration_strong_body: input.corroborationStrongBody,
    what_this_means_execution: input.whatThisMeansExecution,
    what_this_means_orchestration: input.whatThisMeansOrchestration,
    what_this_means_strategic: input.whatThisMeansStrategic,
    what_this_means_systems: input.whatThisMeansSystems,
    strengthen_execution_copy: input.strengthenExecutionCopy,
    add_execution_copy: input.addExecutionCopy,
    strengthen_orchestration_copy: input.strengthenOrchestrationCopy,
    evolve_or_add_orchestration_copy: input.evolveOrAddOrchestrationCopy,
    add_orchestration_copy: input.addOrchestrationCopy,
    strengthen_strategic_copy: input.strengthenStrategicCopy,
    add_strategic_from_orchestration_copy: input.addStrategicFromOrchestrationCopy,
    add_strategic_copy: input.addStrategicCopy,
    strengthen_systems_copy: input.strengthenSystemsCopy,
    add_systems_copy: input.addSystemsCopy,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/executive-support-architecture-config");
  return { ok: true as const, version: nextVersion };
}
