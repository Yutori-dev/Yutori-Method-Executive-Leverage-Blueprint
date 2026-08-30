"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RatingLevel } from "@/types/database";

/**
 * Every function here is a thin wrapper around a SECURITY DEFINER Postgres
 * function -- ownership, module-unlock state, selection-count validity, and
 * zone-eligibility are all re-checked inside the RPC itself, not here. That
 * is deliberate: these RPCs are reachable directly via the Supabase REST
 * API by anyone with a participant's access token, not only through this
 * app, so this file cannot be the only line of defense (task instructions
 * section 21). See supabase/migrations/20260830000002_zone_and_delegation_functions.sql.
 */

/**
 * Rating a responsibility is the only write path -- there is no separate
 * "selection" step. Either value may be null to clear that dimension;
 * clearing either one un-maps the responsibility. The RPC itself enforces
 * the 12-mapped ceiling and re-derives matrix_cell/macro_zone server-side.
 */
export async function rateResponsibility(params: {
  participantSessionId: string;
  responsibilityId: string;
  competency: RatingLevel | null;
  passion: RatingLevel | null;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  // Postgres has no per-parameter nullability annotation, so the generated
  // RPC arg types are non-null `string` even though the function body
  // explicitly accepts and handles null (verified live) -- cast past that
  // generation gap rather than the function's real, tested contract.
  const { data, error } = await supabase.rpc("rate_responsibility", {
    p_participant_session_id: params.participantSessionId,
    p_responsibility_id: params.responsibilityId,
    p_competency: params.competency as string,
    p_passion: params.passion as string,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
  return {
    ok: true as const,
    matrixCell: data?.matrix_cell as string | null,
    macroZone: data?.macro_zone as string | null,
  };
}

/** Sets zone_of_investment_viewed_at once, first time a participant's UI
 * renders the revealed personalized matrix. Never overwritten after that
 * -- a plain RLS-scoped write (own row only), not RPC-gated, matching the
 * "raw participant-authored data" trust level used for view/visit stats
 * elsewhere (e.g. markModuleStarted). */
export async function markZoneOfInvestmentViewed(params: { participantSessionId: string }) {
  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("participant_sessions")
    .select("zone_of_investment_viewed_at")
    .eq("id", params.participantSessionId)
    .maybeSingle();

  if (existing?.zone_of_investment_viewed_at) return { ok: true as const };

  const { error } = await supabase
    .from("participant_sessions")
    .update({ zone_of_investment_viewed_at: new Date().toISOString() })
    .eq("id", params.participantSessionId);

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function selectPriorityDelegationOpportunities(params: {
  participantSessionId: string;
  responsibilityIds: string[];
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("select_priority_delegation_opportunities", {
    p_participant_session_id: params.participantSessionId,
    p_responsibility_ids: params.responsibilityIds,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
  return { ok: true as const };
}
