import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel } from "@/types/database";

export interface EligibleCandidate {
  responsibilityId: string;
  label: string;
  matrixCell: string | null;
  /** Null when the participant never rated this responsibility during
   * Zone of Investment -- eligibility is no longer zone-restricted
   * (client request 2026-09-08: all 21 responsibilities are candidates,
   * not just Ambiguity/Vulnerability), so this is shown for context only. */
  macroZone: "investment" | "ambiguity" | "vulnerability" | null;
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
  blueprintDescription: string | null;
  selectionOrder: number;
  /** Fetched unconditionally (it's cheap, already in this row) but only
   * meant to be shown once architecture has been revealed for the
   * session -- callers decide whether to expose it, same as everywhere
   * else this classification appears. */
  leverageLevelSnapshot: LeverageLevel;
}

export interface DelegationCandidatesData {
  /** All 21 real (active, non-placeholder) library responsibilities --
   * every one is eligible for Priority Delegation Opportunity selection
   * (client request 2026-09-08, reversing the earlier Zone-of-Investment
   * restriction). Ordered by library sort_order. */
  eligible: EligibleCandidate[];
  currentSelections: PrioritySelection[];
  pressureTest: PressureTestState | null;
}

export async function getDelegationCandidates(
  participantSessionId: string,
): Promise<DelegationCandidatesData> {
  const supabase = await createServerSupabaseClient();

  // All 21 real responsibilities are the candidate list now -- rated
  // ones are looked up separately and merged in below just to show each
  // candidate's zone/cell for context, not to filter the list.
  const [{ data: library }, { data: rated }, { data: priorities }, { data: pressureTestRow }] = await Promise.all([
    supabase
      .from("responsibilities")
      .select("id, label")
      .eq("active", true)
      .eq("is_placeholder", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("participant_responsibilities")
      .select("responsibility_id, matrix_cell, macro_zone")
      .eq("participant_session_id", participantSessionId),
    supabase
      .from("priority_delegation_opportunities")
      .select("responsibility_id, selection_order, leverage_level_snapshot, responsibilities(label, blueprint_description)")
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
  const blueprintDescriptionOf = (row: { responsibilities: unknown }) =>
    (row.responsibilities as { blueprint_description: string | null } | null)?.blueprint_description ?? null;
  const ratingByResponsibilityId = new Map((rated ?? []).map((r) => [r.responsibility_id, r]));

  return {
    eligible: (library ?? []).map((r) => {
      const rating = ratingByResponsibilityId.get(r.id);
      return {
        responsibilityId: r.id,
        label: r.label,
        matrixCell: rating?.matrix_cell ?? null,
        macroZone: (rating?.macro_zone as "investment" | "ambiguity" | "vulnerability" | null) ?? null,
      };
    }),
    currentSelections: (priorities ?? []).map((p) => ({
      responsibilityId: p.responsibility_id,
      label: labelOf(p),
      blueprintDescription: blueprintDescriptionOf(p),
      selectionOrder: p.selection_order,
      leverageLevelSnapshot: p.leverage_level_snapshot as LeverageLevel,
    })),
    pressureTest: pressureTestRow
      ? { response: pressureTestRow.response as "yes" | "somewhat" | "no", revisited: pressureTestRow.revisited }
      : null,
  };
}
