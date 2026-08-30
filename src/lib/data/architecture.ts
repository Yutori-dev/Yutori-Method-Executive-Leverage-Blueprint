import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ArchitectureReaction, LeverageLevel } from "@/types/database";

export type ArchitectureSignalType = "primary" | "multi_layer" | "audit_only" | "pending";
export type ArchitectureCorroboration = "strong" | "secondary" | "none";

export interface ArchitectureRecommendationView {
  signalType: ArchitectureSignalType;
  primaryLeverageNeed: LeverageLevel | null;
  leadingLeverageNeed: LeverageLevel | null;
  multiLayerLevels: LeverageLevel[];
  auditCorroboration: ArchitectureCorroboration | null;
  secondaryLeverageNeeds: LeverageLevel[];
  recommendedPrimaryArchitecture: LeverageLevel | null;
  primaryRecommendedAction: string | null;
  secondaryRecommendedActions: string[];
  currentSupportMatchState: LeverageLevel[];
  systemsAmplifierFlag: boolean;
  reaction: ArchitectureReaction | null;
  reactionNote: string | null;
  needsRecalculation: boolean;
}

export interface ArchitectureData {
  hasCalculated: boolean;
  revealed: boolean;
  /** Only populated once `revealed` is true -- RLS blocks reading this row
   * beforehand regardless, so this mirrors what the database will actually
   * return. */
  recommendation: ArchitectureRecommendationView | null;
}

export async function getArchitectureData(
  sessionId: string,
  participantSessionId: string,
): Promise<ArchitectureData> {
  const supabase = await createServerSupabaseClient();

  const [{ data: session }, { data: hasCalculated }] = await Promise.all([
    supabase.from("sessions").select("architecture_revealed").eq("id", sessionId).maybeSingle(),
    supabase.rpc("has_calculated_architecture", { p_participant_session_id: participantSessionId }),
  ]);

  const revealed = session?.architecture_revealed ?? false;

  let recommendation: ArchitectureRecommendationView | null = null;
  if (revealed) {
    const { data: rec } = await supabase
      .from("architecture_recommendations")
      .select(
        "primary_signal_type, primary_leverage_need, leading_leverage_need, multi_layer_levels, audit_corroboration, secondary_leverage_needs, recommended_primary_architecture, primary_recommended_action, secondary_recommended_actions, current_support_match_state, systems_amplifier_flag, reaction, reaction_note, needs_recalculation",
      )
      .eq("participant_session_id", participantSessionId)
      .maybeSingle();

    if (rec) {
      recommendation = {
        signalType: rec.primary_signal_type as ArchitectureSignalType,
        primaryLeverageNeed: rec.primary_leverage_need as LeverageLevel | null,
        leadingLeverageNeed: rec.leading_leverage_need as LeverageLevel | null,
        multiLayerLevels: (rec.multi_layer_levels ?? []) as LeverageLevel[],
        auditCorroboration: rec.audit_corroboration as ArchitectureCorroboration | null,
        secondaryLeverageNeeds: (rec.secondary_leverage_needs ?? []) as LeverageLevel[],
        recommendedPrimaryArchitecture: rec.recommended_primary_architecture as LeverageLevel | null,
        primaryRecommendedAction: rec.primary_recommended_action,
        secondaryRecommendedActions: rec.secondary_recommended_actions ?? [],
        currentSupportMatchState: (rec.current_support_match_state ?? []) as LeverageLevel[],
        systemsAmplifierFlag: rec.systems_amplifier_flag,
        reaction: rec.reaction as ArchitectureReaction | null,
        reactionNote: rec.reaction_note,
        needsRecalculation: rec.needs_recalculation,
      };
    }
  }

  return {
    hasCalculated: hasCalculated === true,
    revealed,
    recommendation,
  };
}
