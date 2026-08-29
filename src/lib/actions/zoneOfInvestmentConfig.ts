"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RatingLevel, MacroZone } from "@/types/database";

export interface ResponsibilityInput {
  key: string;
  label: string;
  sortOrder: number;
}

export interface ZoneCellInput {
  competencyLevel: RatingLevel;
  passionLevel: RatingLevel;
  cellName: string;
  macroZone: MacroZone;
}

/**
 * Saves an edit as new versions -- never mutates current live rows in
 * place, matching the versioning convention used everywhere else in this
 * schema (assessments/questions/answer_options work the same way). RLS
 * already grants admins full CRUD on responsibilities, zone_matrix_cells,
 * and zone_of_investment_config, so this is plain admin-authenticated
 * table writes, no RPC needed.
 */
export async function saveZoneOfInvestmentVersion(input: {
  responsibilities: ResponsibilityInput[];
  zoneCells: ZoneCellInput[];
  competencyDefinitions: Record<RatingLevel, string>;
  passionDefinitions: Record<RatingLevel, string>;
  reflectionPrompts: string[];
}) {
  const supabase = await createServerSupabaseClient();

  const [{ data: latestResp }, { data: latestCell }, { data: latestConfig }] = await Promise.all([
    supabase.from("responsibilities").select("version").order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("zone_matrix_cells").select("version").order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("zone_of_investment_config").select("version").order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const nextRespVersion = (latestResp?.version ?? 0) + 1;
  const nextCellVersion = (latestCell?.version ?? 0) + 1;
  const nextConfigVersion = (latestConfig?.version ?? 0) + 1;

  const { error: respError } = await supabase.from("responsibilities").insert(
    input.responsibilities.map((r) => ({
      key: r.key,
      label: r.label,
      sort_order: r.sortOrder,
      version: nextRespVersion,
      active: true,
      is_placeholder: false,
    })),
  );
  if (respError) return { ok: false as const, message: respError.message };

  const { error: cellError } = await supabase.from("zone_matrix_cells").insert(
    input.zoneCells.map((c) => ({
      competency_level: c.competencyLevel,
      passion_level: c.passionLevel,
      cell_name: c.cellName,
      macro_zone: c.macroZone,
      version: nextCellVersion,
      active: true,
      is_placeholder: false,
    })),
  );
  if (cellError) return { ok: false as const, message: cellError.message };

  const { error: configError } = await supabase.from("zone_of_investment_config").insert({
    version: nextConfigVersion,
    competency_low_def: input.competencyDefinitions.low,
    competency_medium_def: input.competencyDefinitions.medium,
    competency_high_def: input.competencyDefinitions.high,
    passion_low_def: input.passionDefinitions.low,
    passion_medium_def: input.passionDefinitions.medium,
    passion_high_def: input.passionDefinitions.high,
    reflection_prompt_1: input.reflectionPrompts[0] ?? "",
    reflection_prompt_2: input.reflectionPrompts[1] ?? "",
    reflection_prompt_3: input.reflectionPrompts[2] ?? "",
    active: true,
  });
  if (configError) return { ok: false as const, message: configError.message };

  revalidatePath("/admin/zone-of-investment-config");
  return { ok: true as const, version: nextRespVersion };
}
