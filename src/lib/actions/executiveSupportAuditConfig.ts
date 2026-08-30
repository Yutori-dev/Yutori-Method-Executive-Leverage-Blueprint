"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel } from "@/types/database";

export interface ExecutiveSupportAuditQuestionInput {
  sortOrder: number;
  prompt: string;
  options: Record<LeverageLevel, string>;
}

export interface ExecutiveSupportAuditConfigInput {
  introHeader: string;
  introSubheader: string;
  introBody: string;
  resultsIntroCopy: string;
  primaryCopy: Record<LeverageLevel, string>;
  secondaryCopy: Record<LeverageLevel, string>;
  noSecondaryCopy: string;
  secondaryThreshold: number;
  questions: ExecutiveSupportAuditQuestionInput[];
}

/** Saves as a brand-new config version -- never mutates rows a participant
 * may have already answered against, matching the versioning convention
 * used everywhere else in this schema (same shape as
 * saveDelegationBeliefsConfigVersion / saveExecutiveLeverageDiagnosticVersion). */
export async function saveExecutiveSupportAuditConfigVersion(input: ExecutiveSupportAuditConfigInput) {
  const supabase = await createServerSupabaseClient();

  const { data: latest, error: latestError } = await supabase
    .from("executive_support_audit_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { ok: false as const, message: latestError.message };

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: config, error: configError } = await supabase
    .from("executive_support_audit_config")
    .insert({
      version: nextVersion,
      active: true,
      intro_header: input.introHeader,
      intro_subheader: input.introSubheader,
      intro_body: input.introBody,
      results_intro_copy: input.resultsIntroCopy,
      execution_primary_copy: input.primaryCopy.execution,
      orchestration_primary_copy: input.primaryCopy.orchestration,
      strategic_primary_copy: input.primaryCopy.strategic,
      systems_primary_copy: input.primaryCopy.systems,
      execution_secondary_copy: input.secondaryCopy.execution,
      orchestration_secondary_copy: input.secondaryCopy.orchestration,
      strategic_secondary_copy: input.secondaryCopy.strategic,
      systems_secondary_copy: input.secondaryCopy.systems,
      no_secondary_copy: input.noSecondaryCopy,
      secondary_threshold: input.secondaryThreshold,
    })
    .select("id")
    .single();

  if (configError || !config) {
    return { ok: false as const, message: configError?.message ?? "Could not create new version." };
  }

  const { error: questionsError } = await supabase.from("executive_support_audit_questions").insert(
    input.questions.map((q) => ({
      config_id: config.id,
      sort_order: q.sortOrder,
      prompt: q.prompt,
      option_execution: q.options.execution,
      option_orchestration: q.options.orchestration,
      option_strategic: q.options.strategic,
      option_systems: q.options.systems,
      active: true,
    })),
  );

  if (questionsError) return { ok: false as const, message: questionsError.message };

  revalidatePath("/admin/executive-support-audit-config");
  return { ok: true as const, version: nextVersion };
}
