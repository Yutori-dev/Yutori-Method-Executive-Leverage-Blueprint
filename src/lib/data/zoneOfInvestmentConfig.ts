import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RatingLevel, MacroZone } from "@/types/database";

export interface ResponsibilityConfigRow {
  key: string;
  label: string;
  sortOrder: number;
}

export interface ZoneCellConfigRow {
  competencyLevel: RatingLevel;
  passionLevel: RatingLevel;
  cellName: string;
  macroZone: MacroZone;
}

export interface ZoneOfInvestmentConfigData {
  responsibilitiesVersion: number | null;
  zoneCellsVersion: number | null;
  responsibilities: ResponsibilityConfigRow[];
  zoneCells: ZoneCellConfigRow[];
  competencyDefinitions: Record<RatingLevel, string>;
  passionDefinitions: Record<RatingLevel, string>;
  reflectionPrompts: string[];
}

export async function getZoneOfInvestmentConfigData(): Promise<ZoneOfInvestmentConfigData> {
  const supabase = await createServerSupabaseClient();

  const [{ data: responsibilities }, { data: zoneCells }, { data: config }] = await Promise.all([
    supabase
      .from("responsibilities")
      .select("key, label, sort_order, version")
      .eq("active", true)
      .eq("is_placeholder", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("zone_matrix_cells")
      .select("competency_level, passion_level, cell_name, macro_zone, version")
      .eq("active", true)
      .eq("is_placeholder", false),
    supabase
      .from("zone_of_investment_config")
      .select(
        "competency_low_def, competency_medium_def, competency_high_def, passion_low_def, passion_medium_def, passion_high_def, reflection_prompt_1, reflection_prompt_2, reflection_prompt_3",
      )
      .eq("active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    responsibilitiesVersion: responsibilities?.[0]?.version ?? null,
    zoneCellsVersion: zoneCells?.[0]?.version ?? null,
    responsibilities: (responsibilities ?? []).map((r) => ({ key: r.key, label: r.label, sortOrder: r.sort_order })),
    zoneCells: (zoneCells ?? []).map((c) => ({
      competencyLevel: c.competency_level as RatingLevel,
      passionLevel: c.passion_level as RatingLevel,
      cellName: c.cell_name,
      macroZone: c.macro_zone as MacroZone,
    })),
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
  };
}
