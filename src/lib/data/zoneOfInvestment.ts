import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isProduction } from "@/lib/env";
import type { RatingLevel, MacroZone } from "@/types/database";

export interface ResponsibilityOption {
  id: string;
  label: string;
  description: string | null;
}

export interface RatedResponsibility {
  responsibilityId: string;
  label: string;
  competency: RatingLevel | null;
  passion: RatingLevel | null;
  matrixCell: string | null;
  macroZone: MacroZone | null;
}

export interface ZoneCellDefinition {
  competencyLevel: RatingLevel;
  passionLevel: RatingLevel;
  cellName: string;
  macroZone: MacroZone;
  explanation: string | null;
}

export interface ZoneOfInvestmentData {
  /** The full selectable library (placeholder-gated in production). Never
   * includes leverage_level -- that column is hidden from every
   * participant-facing query (task instructions section 9). */
  availableResponsibilities: ResponsibilityOption[];
  /** This participant's current selection, with whatever rating exists so far. */
  selected: RatedResponsibility[];
  /** The active 9-cell configuration, for rendering the matrix legend. Empty
   * until Yutori's mapping (or the dev placeholder) is configured. */
  zoneCells: ZoneCellDefinition[];
}

export async function getZoneOfInvestmentData(
  participantSessionId: string,
): Promise<ZoneOfInvestmentData> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("responsibilities")
    .select("id, label, description, is_placeholder")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (isProduction) {
    query = query.eq("is_placeholder", false);
  }

  const { data: responsibilities } = await query;

  const { data: participantResponsibilities } = await supabase
    .from("participant_responsibilities")
    .select("responsibility_id, competency, passion, matrix_cell, macro_zone")
    .eq("participant_session_id", participantSessionId);

  let zoneCellsQuery = supabase
    .from("zone_matrix_cells")
    .select("competency_level, passion_level, cell_name, macro_zone, explanation, is_placeholder")
    .eq("active", true);

  if (isProduction) {
    zoneCellsQuery = zoneCellsQuery.eq("is_placeholder", false);
  }

  const { data: zoneCells } = await zoneCellsQuery;

  const responsibilityById = new Map((responsibilities ?? []).map((r) => [r.id, r]));

  const selected: RatedResponsibility[] = (participantResponsibilities ?? []).map((pr) => ({
    responsibilityId: pr.responsibility_id,
    label: responsibilityById.get(pr.responsibility_id)?.label ?? "[Removed responsibility]",
    competency: pr.competency as RatingLevel | null,
    passion: pr.passion as RatingLevel | null,
    matrixCell: pr.matrix_cell,
    macroZone: pr.macro_zone as MacroZone | null,
  }));

  return {
    availableResponsibilities: (responsibilities ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      description: r.description,
    })),
    selected,
    zoneCells: (zoneCells ?? []).map((c) => ({
      competencyLevel: c.competency_level as RatingLevel,
      passionLevel: c.passion_level as RatingLevel,
      cellName: c.cell_name,
      macroZone: c.macro_zone as MacroZone,
      explanation: c.explanation,
    })),
  };
}
