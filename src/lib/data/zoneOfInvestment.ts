import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RatingLevel, MacroZone } from "@/types/database";

export interface ResponsibilityOption {
  id: string;
  label: string;
  description: string | null;
}

/** State-1-safe: competency/passion only, never a zone name or macro zone --
 * "The Zone names and macro-zone classifications should not appear during
 * State 1" is enforced here, at the loader, not left to the component to
 * remember not to render. */
export interface RatedResponsibility {
  responsibilityId: string;
  competency: RatingLevel | null;
  passion: RatingLevel | null;
}

export interface PersonalizedPlacement {
  responsibilityId: string;
  label: string;
  blueprintDescription: string | null;
  competencyLevel: RatingLevel;
  passionLevel: RatingLevel;
  cellName: string;
  macroZone: MacroZone;
}

export interface ZoneOfInvestmentConfig {
  competencyDefinitions: Record<RatingLevel, string>;
  passionDefinitions: Record<RatingLevel, string>;
  reflectionPrompts: string[];
}

export interface ZoneCellDefinition {
  competencyLevel: RatingLevel;
  passionLevel: RatingLevel;
  cellName: string;
  macroZone: MacroZone;
}

export interface ZoneOfInvestmentData {
  library: ResponsibilityOption[];
  ratings: RatedResponsibility[];
  mappedCount: number;
  revealed: boolean;
  alreadyViewed: boolean;
  /** All 9 cells, for the grid's own labels -- always fetched, small table. */
  zoneCells: ZoneCellDefinition[];
  /** Only populated once revealed=true. */
  personalizedPlacements: PersonalizedPlacement[];
  macroZoneDistribution: { investment: number; ambiguity: number; vulnerability: number };
  config: ZoneOfInvestmentConfig;
}

export async function getZoneOfInvestmentData(
  sessionId: string,
  participantSessionId: string,
): Promise<ZoneOfInvestmentData> {
  const supabase = await createServerSupabaseClient();

  const [
    { data: library },
    { data: ratingRows },
    { data: session },
    { data: participantSession },
    { data: config },
    { data: zoneCells },
  ] = await Promise.all([
    supabase
      .from("responsibilities")
      .select("id, label, description")
      .eq("active", true)
      .eq("is_placeholder", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("participant_responsibilities")
      .select("responsibility_id, competency, passion, matrix_cell, macro_zone, responsibilities(label, blueprint_description)")
      .eq("participant_session_id", participantSessionId),
    supabase.from("sessions").select("zone_of_investment_revealed").eq("id", sessionId).maybeSingle(),
    supabase
      .from("participant_sessions")
      .select("zone_of_investment_viewed_at")
      .eq("id", participantSessionId)
      .maybeSingle(),
    supabase
      .from("zone_of_investment_config")
      .select(
        "competency_low_def, competency_medium_def, competency_high_def, passion_low_def, passion_medium_def, passion_high_def, reflection_prompt_1, reflection_prompt_2, reflection_prompt_3",
      )
      .eq("active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("zone_matrix_cells")
      .select("competency_level, passion_level, cell_name, macro_zone")
      .eq("active", true)
      .eq("is_placeholder", false),
  ]);

  const revealed = session?.zone_of_investment_revealed ?? false;
  const rows = ratingRows ?? [];

  const mappedCount = rows.filter((r) => r.competency !== null && r.passion !== null).length;

  const personalizedPlacements: PersonalizedPlacement[] = revealed
    ? rows
        .filter((r) => r.competency !== null && r.passion !== null && r.matrix_cell !== null)
        .map((r) => ({
          responsibilityId: r.responsibility_id,
          label: (r.responsibilities as { label: string } | null)?.label ?? "[Removed responsibility]",
          blueprintDescription: (r.responsibilities as { blueprint_description: string | null } | null)?.blueprint_description ?? null,
          competencyLevel: r.competency as RatingLevel,
          passionLevel: r.passion as RatingLevel,
          cellName: r.matrix_cell as string,
          macroZone: r.macro_zone as MacroZone,
        }))
    : [];

  const macroZoneDistribution = { investment: 0, ambiguity: 0, vulnerability: 0 };
  for (const p of personalizedPlacements) {
    macroZoneDistribution[p.macroZone] += 1;
  }

  return {
    library: (library ?? []).map((r) => ({ id: r.id, label: r.label, description: r.description })),
    ratings: rows.map((r) => ({
      responsibilityId: r.responsibility_id,
      competency: r.competency as RatingLevel | null,
      passion: r.passion as RatingLevel | null,
    })),
    mappedCount,
    revealed,
    alreadyViewed: participantSession?.zone_of_investment_viewed_at !== null,
    // Only sent to the client once revealed -- otherwise the real zone/
    // macro-zone names would sit in the page's hydration payload
    // (inspectable via view-source) even though the mapping-phase UI never
    // renders them, undermining "zone names should not appear during
    // State 1" even though nothing on screen shows them.
    zoneCells: revealed
      ? (zoneCells ?? []).map((c) => ({
          competencyLevel: c.competency_level as RatingLevel,
          passionLevel: c.passion_level as RatingLevel,
          cellName: c.cell_name,
          macroZone: c.macro_zone as MacroZone,
        }))
      : [],
    personalizedPlacements,
    macroZoneDistribution,
    config: {
      competencyDefinitions: {
        low: config?.competency_low_def ?? "",
        medium: config?.competency_medium_def ?? "",
        high: config?.competency_high_def ?? "",
      },
      passionDefinitions: {
        low: config?.passion_low_def ?? "",
        medium: config?.passion_medium_def ?? "",
        high: config?.passion_high_def ?? "",
      },
      reflectionPrompts: [config?.reflection_prompt_1, config?.reflection_prompt_2, config?.reflection_prompt_3].filter(
        (p): p is string => !!p,
      ),
    },
  };
}

