import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface EligibleCandidate {
  responsibilityId: string;
  label: string;
  matrixCell: string | null;
}

export interface PrioritySelection {
  responsibilityId: string;
  label: string;
  selectionOrder: number;
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

  const { data: delegationAssessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("key", "dev_demo_delegation_beliefs")
    .eq("active", true)
    .maybeSingle();

  const [{ data: rated }, { data: priorities }, { data: result }] = await Promise.all([
    supabase
      .from("participant_responsibilities")
      .select("responsibility_id, matrix_cell, macro_zone")
      .eq("participant_session_id", participantSessionId)
      .in("macro_zone", ["ambiguity", "vulnerability"]),
    supabase
      .from("priority_delegation_opportunities")
      .select("responsibility_id, selection_order")
      .eq("participant_session_id", participantSessionId)
      .order("selection_order", { ascending: true }),
    delegationAssessment
      ? supabase
          .from("assessment_results")
          .select("overall_result, interpretation, dimension_scores")
          .eq("participant_session_id", participantSessionId)
          .eq("assessment_id", delegationAssessment.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const responsibilityIds = [
    ...new Set([
      ...(rated ?? []).map((r) => r.responsibility_id),
      ...(priorities ?? []).map((p) => p.responsibility_id),
    ]),
  ];

  const { data: responsibilities } =
    responsibilityIds.length > 0
      ? await supabase.from("responsibilities").select("id, label").in("id", responsibilityIds)
      : { data: [] };

  const labelById = new Map((responsibilities ?? []).map((r) => [r.id, r.label]));

  return {
    eligible: (rated ?? []).map((r) => ({
      responsibilityId: r.responsibility_id,
      label: labelById.get(r.responsibility_id) ?? "[Removed responsibility]",
      matrixCell: r.matrix_cell,
    })),
    currentSelections: (priorities ?? []).map((p) => ({
      responsibilityId: p.responsibility_id,
      label: labelById.get(p.responsibility_id) ?? "[Removed responsibility]",
      selectionOrder: p.selection_order,
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
