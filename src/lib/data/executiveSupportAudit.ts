import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel } from "@/types/database";

export interface ExecutiveSupportAuditQuestion {
  id: string;
  sortOrder: number;
  prompt: string;
  options: { layer: LeverageLevel; text: string }[];
}

export interface ExecutiveSupportAuditConfig {
  introHeader: string;
  introSubheader: string;
  introBody: string;
  resultsIntroCopy: string;
  primaryCopy: Record<LeverageLevel, string>;
  secondaryCopy: Record<LeverageLevel, string>;
  noSecondaryCopy: string;
}

export interface ExecutiveSupportAuditResult {
  scores: Record<LeverageLevel, number>;
  primaryLayers: LeverageLevel[];
  secondaryLayers: LeverageLevel[];
}

export interface ExecutiveSupportAuditData {
  config: ExecutiveSupportAuditConfig;
  questions: ExecutiveSupportAuditQuestion[];
  responses: Record<string, LeverageLevel>;
  result: ExecutiveSupportAuditResult | null;
}

function optionsFor(q: {
  option_execution: string;
  option_orchestration: string;
  option_strategic: string;
  option_systems: string;
}): { layer: LeverageLevel; text: string }[] {
  return [
    { layer: "execution", text: q.option_execution },
    { layer: "orchestration", text: q.option_orchestration },
    { layer: "strategic", text: q.option_strategic },
    { layer: "systems", text: q.option_systems },
  ];
}

export interface ExecutiveSupportAuditSummary {
  primary: { layer: LeverageLevel; interpretation: string }[];
  secondary: { layer: LeverageLevel; interpretation: string }[];
  noSecondaryCopy: string | null;
}

/** Blueprint/admin-view helper -- the participant's Primary/Secondary
 * Leverage Gap(s) with their interpretation copy, and the "no clear
 * secondary" message when applicable (only meaningful when there's a
 * single Primary layer; a tied Primary never has a Secondary, per spec
 * section 6). */
export function getExecutiveSupportAuditSummary(data: ExecutiveSupportAuditData): ExecutiveSupportAuditSummary | null {
  if (!data.result) return null;
  const { primaryLayers, secondaryLayers } = data.result;
  return {
    primary: primaryLayers.map((layer) => ({ layer, interpretation: data.config.primaryCopy[layer] })),
    secondary: secondaryLayers.map((layer) => ({ layer, interpretation: data.config.secondaryCopy[layer] })),
    noSecondaryCopy: primaryLayers.length === 1 && secondaryLayers.length === 0 ? data.config.noSecondaryCopy : null,
  };
}

export async function getExecutiveSupportAuditData(participantSessionId: string): Promise<ExecutiveSupportAuditData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: config } = await supabase
    .from("executive_support_audit_config")
    .select(
      "id, intro_header, intro_subheader, intro_body, results_intro_copy, execution_primary_copy, orchestration_primary_copy, strategic_primary_copy, systems_primary_copy, execution_secondary_copy, orchestration_secondary_copy, strategic_secondary_copy, systems_secondary_copy, no_secondary_copy",
    )
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!config) return null;

  const [{ data: questions }, { data: responseRows }, { data: resultRow }] = await Promise.all([
    supabase
      .from("executive_support_audit_questions")
      .select("id, sort_order, prompt, option_execution, option_orchestration, option_strategic, option_systems")
      .eq("config_id", config.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("executive_support_audit_responses")
      .select("question_id, selected_layer")
      .eq("participant_session_id", participantSessionId),
    supabase
      .from("executive_support_audit_results")
      .select("execution_score, orchestration_score, strategic_score, systems_score, primary_layers, secondary_layers")
      .eq("participant_session_id", participantSessionId)
      .maybeSingle(),
  ]);

  return {
    config: {
      introHeader: config.intro_header,
      introSubheader: config.intro_subheader,
      introBody: config.intro_body,
      resultsIntroCopy: config.results_intro_copy,
      primaryCopy: {
        execution: config.execution_primary_copy,
        orchestration: config.orchestration_primary_copy,
        strategic: config.strategic_primary_copy,
        systems: config.systems_primary_copy,
      },
      secondaryCopy: {
        execution: config.execution_secondary_copy,
        orchestration: config.orchestration_secondary_copy,
        strategic: config.strategic_secondary_copy,
        systems: config.systems_secondary_copy,
      },
      noSecondaryCopy: config.no_secondary_copy,
    },
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      sortOrder: q.sort_order,
      prompt: q.prompt,
      options: optionsFor(q),
    })),
    responses: Object.fromEntries((responseRows ?? []).map((r) => [r.question_id, r.selected_layer as LeverageLevel])),
    result: resultRow
      ? {
          scores: {
            execution: resultRow.execution_score,
            orchestration: resultRow.orchestration_score,
            strategic: resultRow.strategic_score,
            systems: resultRow.systems_score,
          },
          primaryLayers: resultRow.primary_layers as LeverageLevel[],
          secondaryLayers: resultRow.secondary_layers as LeverageLevel[],
        }
      : null,
  };
}
