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

export interface PriorityDelegationConfig {
  introCopy: string;
  fewerThanThreeCopy: string;
  zeroEligibleCopy: string;
  zoneAmbiguityDescription: string;
  zoneVulnerabilityDescription: string;
  pressureTestQuestion: string;
  somewhatNoFollowupCopy: string;
  confirmationCopy: string;
}

const FALLBACK_PRIORITY_DELEGATION_CONFIG: PriorityDelegationConfig = {
  introCopy:
    "You identified the responsibilities below as sitting outside your Zone of Investment. Select the responsibilities where transferring ownership would create the greatest value for you.",
  fewerThanThreeCopy: "Select the responsibilities you would most value transferring from those shown below.",
  zeroEligibleCopy:
    "You did not identify any responsibilities outside your Zone of Investment. No Priority Delegation Opportunities are assigned.",
  zoneAmbiguityDescription: "Your capability or interest makes your continued ownership worth examining.",
  zoneVulnerabilityDescription: "Work where your current investment is less likely to represent your highest and best use.",
  pressureTestQuestion:
    "If you no longer owned these responsibilities, would you experience a meaningful increase in available capacity?",
  somewhatNoFollowupCopy:
    "Consider whether there are other responsibilities on your list where transferring ownership would create greater capacity or leverage.",
  confirmationCopy:
    "These are the responsibilities we'll use next to explore the kind of executive leverage that could create greater capacity around you.",
};

export async function getPriorityDelegationConfig(): Promise<PriorityDelegationConfig> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("priority_delegation_config")
    .select(
      "intro_copy, fewer_than_three_copy, zero_eligible_copy, zone_ambiguity_description, zone_vulnerability_description, pressure_test_question, somewhat_no_followup_copy, confirmation_copy",
    )
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return FALLBACK_PRIORITY_DELEGATION_CONFIG;

  return {
    introCopy: data.intro_copy,
    fewerThanThreeCopy: data.fewer_than_three_copy,
    zeroEligibleCopy: data.zero_eligible_copy,
    zoneAmbiguityDescription: data.zone_ambiguity_description,
    zoneVulnerabilityDescription: data.zone_vulnerability_description,
    pressureTestQuestion: data.pressure_test_question,
    somewhatNoFollowupCopy: data.somewhat_no_followup_copy,
    confirmationCopy: data.confirmation_copy,
  };
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
