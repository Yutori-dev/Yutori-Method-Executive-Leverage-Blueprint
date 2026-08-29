import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ArchitectureReaction, LeverageLevel } from "@/types/database";

export interface SupportingSignal {
  selectionOrder: number;
  responsibilityLabel: string;
  leverageLevelSnapshot: LeverageLevel;
}

export interface ArchitectureRecommendationView {
  isTied: boolean;
  primarySignalLeverageLevel: LeverageLevel | null;
  primaryResult: string | null;
  primaryRole: string | null;
  secondaryResult: string | null;
  rationale: string;
  supportingSignals: SupportingSignal[];
  reaction: ArchitectureReaction | null;
  reactionNote: string | null;
}

export interface ArchitectureData {
  priorityOpportunitiesReady: boolean;
  hasCalculated: boolean;
  revealed: boolean;
  /** Only populated once `revealed` is true -- RLS blocks reading this row
   * beforehand regardless, so this mirrors what the database will actually
   * return (brief section 9 / task instructions section 21). */
  recommendation: ArchitectureRecommendationView | null;
}

export async function getArchitectureData(
  sessionId: string,
  participantSessionId: string,
): Promise<ArchitectureData> {
  const supabase = await createServerSupabaseClient();

  const [{ count: priorityCount }, { data: session }, { data: hasCalculated }] = await Promise.all([
    supabase
      .from("priority_delegation_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("participant_session_id", participantSessionId),
    supabase.from("sessions").select("architecture_revealed").eq("id", sessionId).maybeSingle(),
    supabase.rpc("has_calculated_architecture", { p_participant_session_id: participantSessionId }),
  ]);

  const revealed = session?.architecture_revealed ?? false;

  let recommendation: ArchitectureRecommendationView | null = null;
  if (revealed) {
    const { data: rec } = await supabase
      .from("architecture_recommendations")
      .select(
        "is_tied, primary_signal_leverage_level, primary_result, primary_role, secondary_result, rationale, supporting_signals, reaction, reaction_note",
      )
      .eq("participant_session_id", participantSessionId)
      .maybeSingle();

    if (rec) {
      recommendation = {
        isTied: rec.is_tied,
        primarySignalLeverageLevel: rec.primary_signal_leverage_level as LeverageLevel | null,
        primaryResult: rec.primary_result,
        primaryRole: rec.primary_role,
        secondaryResult: rec.secondary_result,
        rationale: rec.rationale,
        supportingSignals: (rec.supporting_signals as unknown as SupportingSignal[]) ?? [],
        reaction: rec.reaction as ArchitectureReaction | null,
        reactionNote: rec.reaction_note,
      };
    }
  }

  return {
    priorityOpportunitiesReady: (priorityCount ?? 0) === 3,
    hasCalculated: hasCalculated === true,
    revealed,
    recommendation,
  };
}
