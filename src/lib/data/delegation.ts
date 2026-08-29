import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeverageLevel } from "@/types/database";

export interface EligibleCandidate {
  responsibilityId: string;
  label: string;
  matrixCell: string | null;
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

export interface DelegationReadinessResult {
  overallResult: string | null;
  interpretation: string | null;
  dimensionScores: Record<string, number>;
}

export interface DelegationCandidatesData {
  /** Responsibilities rated outside the Zone of Investment (ambiguity or
   * vulnerability) for this participant_session -- the only ones eligible
   * for Priority Delegation Opportunity selection (brief section 11). */
  eligible: EligibleCandidate[];
  currentSelections: PrioritySelection[];
  readinessResult: DelegationReadinessResult | null;
}

export async function getDelegationCandidates(
  participantSessionId: string,
): Promise<DelegationCandidatesData> {
  const supabase = await createServerSupabaseClient();

  // All three queries run as one round trip. responsibilities(label) is
  // embedded directly instead of resolved through a separate batch lookup,
  // and the assessment_results query joins to assessments via an
  // inner-join filter instead of needing a separate lookup first to find
  // the Delegation Beliefs assessment's id.
  const [{ data: rated }, { data: priorities }, { data: result }] = await Promise.all([
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
      .from("assessment_results")
      .select("overall_result, interpretation, dimension_scores, assessments!inner(key)")
      .eq("participant_session_id", participantSessionId)
      .eq("assessments.key", "dev_demo_delegation_beliefs")
      .maybeSingle(),
  ]);

  const labelOf = (row: { responsibilities: unknown }) =>
    (row.responsibilities as { label: string } | null)?.label ?? "[Removed responsibility]";

  return {
    eligible: (rated ?? []).map((r) => ({
      responsibilityId: r.responsibility_id,
      label: labelOf(r),
      matrixCell: r.matrix_cell,
    })),
    currentSelections: (priorities ?? []).map((p) => ({
      responsibilityId: p.responsibility_id,
      label: labelOf(p),
      selectionOrder: p.selection_order,
      leverageLevelSnapshot: p.leverage_level_snapshot as LeverageLevel,
    })),
    readinessResult: result
      ? {
          overallResult: result.overall_result,
          interpretation: result.interpretation,
          dimensionScores: (result.dimension_scores as Record<string, number>) ?? {},
        }
      : null,
  };
}
