import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel } from "@/types/database";

export interface EligibleCandidate {
  responsibilityId: string;
  label: string;
  matrixCell: string | null;
  macroZone: "ambiguity" | "vulnerability";
}

export interface PressureTestState {
  response: "yes" | "somewhat" | "no";
  revisited: boolean;
}

export interface PrioritySelection {
  responsibilityId: string;
  label: string;
  selectionOrder: number;
  /** Fetched unconditionally (it's cheap, already in this row) but only
   * meant to be shown once architecture has been revealed for the
   * session -- callers decide whether to expose it, same as everywhere
   * else this classification appears. */
  leverageLevelSnapshot: LeverageLevel;
}

export interface DelegationCandidatesData {
  /** Responsibilities rated outside the Zone of Investment (ambiguity or
   * vulnerability) for this participant_session -- the only ones eligible
   * for Priority Delegation Opportunity selection (brief section 11). */
  eligible: EligibleCandidate[];
  currentSelections: PrioritySelection[];
  pressureTest: PressureTestState | null;
}

export async function getDelegationCandidates(
  participantSessionId: string,
): Promise<DelegationCandidatesData> {
  const supabase = await createServerSupabaseClient();

  // responsibilities(label) is embedded directly instead of resolved
  // through a separate batch lookup.
  const [{ data: rated }, { data: priorities }, { data: pressureTestRow }] = await Promise.all([
    supabase
      .from("participant_responsibilities")
      .select("responsibility_id, matrix_cell, macro_zone, responsibilities(label)")
      .eq("participant_session_id", participantSessionId)
      .in("macro_zone", ["ambiguity", "vulnerability"]),
    supabase
      .from("priority_delegation_opportunities")
      .select("responsibility_id, selection_order, leverage_level_snapshot, responsibilities(label)")
      .eq("participant_session_id", participantSessionId)
      .order("selection_order", { ascending: true }),
    supabase
      .from("priority_delegation_pressure_test")
      .select("response, revisited")
      .eq("participant_session_id", participantSessionId)
      .maybeSingle(),
  ]);

  const labelOf = (row: { responsibilities: unknown }) =>
    (row.responsibilities as { label: string } | null)?.label ?? "[Removed responsibility]";

  return {
    eligible: (rated ?? []).map((r) => ({
      responsibilityId: r.responsibility_id,
      label: labelOf(r),
      matrixCell: r.matrix_cell,
      macroZone: r.macro_zone as "ambiguity" | "vulnerability",
    })),
    currentSelections: (priorities ?? []).map((p) => ({
      responsibilityId: p.responsibility_id,
      label: labelOf(p),
      selectionOrder: p.selection_order,
      leverageLevelSnapshot: p.leverage_level_snapshot as LeverageLevel,
    })),
    pressureTest: pressureTestRow
      ? { response: pressureTestRow.response as "yes" | "somewhat" | "no", revisited: pressureTestRow.revisited }
      : null,
  };
}
