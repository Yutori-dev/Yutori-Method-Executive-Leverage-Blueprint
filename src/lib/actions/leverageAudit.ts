"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markModuleComplete } from "@/lib/actions/participant";
import {
  classifyLeverageAudit,
  missingLeverageAuditFields,
  type LeverageAuditAnswers,
  type LeverageAuditConfig,
} from "@/lib/leverageAuditSchema";
import type { Json } from "@/types/database";

/** Resolves the Visionary<->EA dyad for this submission, via the existing
 * master-profile pairing feature (PairProfileControl) -- not new UI.
 * Everything about the counterpart, including whether the caller is even
 * paired at all, comes from one security-definer RPC
 * (resolve_dyad_counterpart_session) -- found live during verification
 * that master_profiles is admin-only for SELECT too (not just write), so a
 * participant's own client can't read its own paired_master_profile_id
 * directly; that read was failing silently (RLS filters to zero rows, not
 * an error) rather than throwing. The RPC does that lookup itself instead
 * of the caller needing table access at all. If the caller's profile
 * isn't paired, or the counterpart isn't enrolled in this session, both
 * fields stay null and the submission is simply unmatched. */
async function resolveDyad(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  sessionId: string,
): Promise<{ dyadId: string | null; associatedExecutiveParticipantSessionId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { dyadId: null, associatedExecutiveParticipantSessionId: null };

  const { data: me } = await supabase.from("participants").select("master_profile_id").eq("id", user.id).maybeSingle();
  if (!me) return { dyadId: null, associatedExecutiveParticipantSessionId: null };

  const { data: rows, error } = await supabase.rpc("resolve_dyad_counterpart_session", {
    p_session_id: sessionId,
  });
  const match = rows?.[0];
  if (error || !match) return { dyadId: null, associatedExecutiveParticipantSessionId: null };

  // Deterministic, order-independent pair id so both sides compute the
  // same value without needing to read each other's submission first.
  // structured_assessment_submissions.dyad_id is a uuid column, so the
  // sorted pair is hashed into uuid shape (version-5-style) rather than
  // stored as "idA:idB".
  const hash = createHash("sha1")
    .update([me.master_profile_id, match.counterpart_master_profile_id].sort().join(":"))
    .digest("hex");
  const dyadId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

  return { dyadId, associatedExecutiveParticipantSessionId: match.counterpart_session_id };
}

export async function submitLeverageAudit(params: {
  participantSessionId: string;
  assessmentId: string;
  versionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
  sessionId: string;
  answers: LeverageAuditAnswers;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: version } = await supabase
    .from("structured_assessment_versions")
    .select("config")
    .eq("id", params.versionId)
    .maybeSingle();
  if (!version) return { ok: false as const, message: "Assessment version not found." };
  const config = version.config as unknown as LeverageAuditConfig;

  const { data: existing } = await supabase
    .from("structured_assessment_submissions")
    .select("answers")
    .eq("participant_session_id", params.participantSessionId)
    .eq("assessment_id", params.assessmentId)
    .maybeSingle();
  const previous = (existing?.answers as unknown as LeverageAuditAnswers | undefined) ?? { context: {}, responses: {} };
  const merged: LeverageAuditAnswers = {
    context: { ...previous.context, ...params.answers.context },
    responses: { ...previous.responses, ...params.answers.responses },
    noCurrentEa: params.answers.noCurrentEa ?? previous.noCurrentEa,
  };

  const missing = missingLeverageAuditFields(config, merged);
  if (missing.length > 0) {
    return { ok: false as const, message: "A few required questions are still blank." };
  }

  const classification = classifyLeverageAudit(config, merged);
  const dyad = merged.noCurrentEa
    ? { dyadId: null, associatedExecutiveParticipantSessionId: null }
    : await resolveDyad(supabase, params.sessionId);
  const derived = { ...classification, ...dyad };

  const { error } = await supabase.from("structured_assessment_submissions").upsert(
    {
      participant_session_id: params.participantSessionId,
      assessment_id: params.assessmentId,
      version_id: params.versionId,
      answers: merged as unknown as Json,
      derived: derived as unknown as Json,
      status: "complete",
      completed_at: new Date().toISOString(),
      dyad_id: dyad.dyadId,
      associated_executive_participant_session_id: dyad.associatedExecutiveParticipantSessionId,
    },
    { onConflict: "participant_session_id,assessment_id" },
  );
  if (error) return { ok: false as const, message: error.message };

  await markModuleComplete({
    participantSessionId: params.participantSessionId,
    moduleId: params.moduleId,
    moduleKey: params.moduleKey,
    sessionPath: params.sessionPath,
  });

  revalidatePath(params.sessionPath);
  return { ok: true as const };
}

/** Saves in-progress answers without completing -- same merge logic as
 * submit, kept separate since autosave must never trigger the no-ea exit
 * branch or run the classification/dyad work on every keystroke. */
export async function saveLeverageAuditAnswers(params: {
  participantSessionId: string;
  assessmentId: string;
  versionId: string;
  answers: LeverageAuditAnswers;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("structured_assessment_submissions")
    .select("answers, status")
    .eq("participant_session_id", params.participantSessionId)
    .eq("assessment_id", params.assessmentId)
    .maybeSingle();
  const previous = (existing?.answers as unknown as LeverageAuditAnswers | undefined) ?? { context: {}, responses: {} };
  const merged: LeverageAuditAnswers = {
    context: { ...previous.context, ...params.answers.context },
    responses: { ...previous.responses, ...params.answers.responses },
    noCurrentEa: params.answers.noCurrentEa ?? previous.noCurrentEa,
  };

  const { error } = await supabase.from("structured_assessment_submissions").upsert(
    {
      participant_session_id: params.participantSessionId,
      assessment_id: params.assessmentId,
      version_id: params.versionId,
      answers: merged as unknown as Json,
      status: existing?.status === "complete" ? "complete" : "in_progress",
      started_at: existing ? undefined : new Date().toISOString(),
    },
    { onConflict: "participant_session_id,assessment_id" },
  );
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}
