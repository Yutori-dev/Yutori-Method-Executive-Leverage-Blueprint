import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDelegationCandidates } from "@/lib/data/delegation";
import type { LeverageLevel } from "@/types/database";

const LEVEL_ORDER: LeverageLevel[] = ["execution", "orchestration", "strategic", "systems"];

export interface PriorityLeverageRevealConfig {
  revealHeader: string;
  revealIntro: string;
  leveragePatternHeader: string;
  auditContextHeader: string;
  noSecondaryGapLabel: string;
  interpretationHeadline: string;
  interpretationBody: string;
}

export interface PriorityLeverageOpportunity {
  responsibilityId: string;
  label: string;
  selectionOrder: number;
  /** Null until the client supplies the responsibility -> leverage-level
   * mapping (docs/CLIENT_QUESTIONS.md item 6, still unresolved) -- every
   * real confirmed opportunity has this null today. Callers must render a
   * "not yet classified" fallback rather than assume a value. */
  leverageLevel: LeverageLevel | null;
}

export interface PriorityLeverageRevealData {
  revealed: boolean;
  config: PriorityLeverageRevealConfig;
  opportunities: PriorityLeverageOpportunity[];
  /** Only counts opportunities with a non-null leverageLevel -- a pending
   * classification never fabricates a pattern entry. */
  leveragePattern: { level: LeverageLevel; count: number }[];
  auditCalculated: boolean;
  auditPrimaryLayers: LeverageLevel[];
  auditSecondaryLayers: LeverageLevel[];
}

/** Combines a participant's already-confirmed Priority Delegation
 * Opportunities (with their hidden leverage_level_snapshot) and their
 * already-calculated Executive Support Audit results for reference. No new
 * scoring -- a read-time combination of two existing results, gated on
 * sessions.priority_leverage_reveal_unlocked at this loader level (not RLS,
 * see the migration's comment for why). */
export async function getPriorityLeverageRevealData(
  sessionId: string,
  participantSessionId: string,
): Promise<PriorityLeverageRevealData | null> {
  const supabase = await createServerSupabaseClient();

  const [{ data: session }, { data: configRow }, candidates, { data: auditResult }] = await Promise.all([
    supabase.from("sessions").select("priority_leverage_reveal_unlocked").eq("id", sessionId).maybeSingle(),
    supabase
      .from("priority_leverage_reveal_config")
      .select(
        "reveal_header, reveal_intro, leverage_pattern_header, audit_context_header, no_secondary_gap_label, interpretation_headline, interpretation_body",
      )
      .eq("active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getDelegationCandidates(participantSessionId),
    supabase
      .from("executive_support_audit_results")
      .select("primary_layers, secondary_layers")
      .eq("participant_session_id", participantSessionId)
      .maybeSingle(),
  ]);

  if (!configRow) return null;

  const opportunities: PriorityLeverageOpportunity[] = candidates.currentSelections.map((s) => ({
    responsibilityId: s.responsibilityId,
    label: s.label,
    selectionOrder: s.selectionOrder,
    leverageLevel: (s.leverageLevelSnapshot as LeverageLevel | null) ?? null,
  }));

  const counts = new Map<LeverageLevel, number>();
  for (const o of opportunities) {
    if (!o.leverageLevel) continue;
    counts.set(o.leverageLevel, (counts.get(o.leverageLevel) ?? 0) + 1);
  }
  const leveragePattern = LEVEL_ORDER.filter((level) => counts.has(level)).map((level) => ({
    level,
    count: counts.get(level)!,
  }));

  return {
    revealed: session?.priority_leverage_reveal_unlocked ?? false,
    config: {
      revealHeader: configRow.reveal_header,
      revealIntro: configRow.reveal_intro,
      leveragePatternHeader: configRow.leverage_pattern_header,
      auditContextHeader: configRow.audit_context_header,
      noSecondaryGapLabel: configRow.no_secondary_gap_label,
      interpretationHeadline: configRow.interpretation_headline,
      interpretationBody: configRow.interpretation_body,
    },
    opportunities,
    leveragePattern,
    auditCalculated: !!auditResult,
    auditPrimaryLayers: (auditResult?.primary_layers ?? []) as LeverageLevel[],
    auditSecondaryLayers: (auditResult?.secondary_layers ?? []) as LeverageLevel[],
  };
}
