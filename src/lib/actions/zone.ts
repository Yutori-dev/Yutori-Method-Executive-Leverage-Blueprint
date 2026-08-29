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

export async function selectResponsibilities(params: {
  participantSessionId: string;
  responsibilityIds: string[];
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("select_responsibilities", {
    p_participant_session_id: params.participantSessionId,
    p_responsibility_ids: params.responsibilityIds,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
  return { ok: true as const };
}

export async function rateResponsibility(params: {
  participantSessionId: string;
  responsibilityId: string;
  competency: RatingLevel;
  passion: RatingLevel;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rate_responsibility", {
    p_participant_session_id: params.participantSessionId,
    p_responsibility_id: params.responsibilityId,
    p_competency: params.competency,
    p_passion: params.passion,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
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

export async function calculateDelegationReadiness(params: {
  participantSessionId: string;
  assessmentKey: string;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("calculate_delegation_readiness", {
    p_participant_session_id: params.participantSessionId,
    p_assessment_key: params.assessmentKey,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
  return { ok: true as const };
}
