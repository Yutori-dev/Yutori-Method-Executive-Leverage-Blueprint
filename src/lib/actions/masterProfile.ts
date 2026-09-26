"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findMasterProfileIdByEmail } from "@/lib/data/masterProfile";

export async function mergeParticipantByEmail(params: {
  targetMasterProfileId: string;
  sourceEmail: string;
}) {
  const supabase = await createServerSupabaseClient();

  const found = await findMasterProfileIdByEmail(params.sourceEmail);
  if (!found) return { ok: false as const, message: "No participant found with that email." };
  if (found.masterProfileId === params.targetMasterProfileId) {
    return { ok: false as const, message: "That registration is already part of this profile." };
  }

  const { error } = await supabase.rpc("admin_merge_participant", {
    p_participant_id: found.participantId,
    p_target_master_profile_id: params.targetMasterProfileId,
  });
  if (error) return { ok: false as const, message: error.message };

  revalidatePath(`/admin/participants/${params.targetMasterProfileId}`);
  revalidatePath("/admin/participants");
  return { ok: true as const, mergedName: `${found.firstName} ${found.lastName}` };
}

export async function pairMasterProfilesByEmail(params: {
  masterProfileId: string;
  counterpartEmail: string;
}) {
  const supabase = await createServerSupabaseClient();

  const found = await findMasterProfileIdByEmail(params.counterpartEmail);
  if (!found) return { ok: false as const, message: "No participant found with that email." };
  if (found.masterProfileId === params.masterProfileId) {
    return { ok: false as const, message: "A profile can't be paired with itself." };
  }

  // Symmetric -- shown from both sides when queried, so both rows are set
  // in one go rather than relying on the reader to look both directions.
  const { error: e1 } = await supabase
    .from("master_profiles")
    .update({ paired_master_profile_id: found.masterProfileId })
    .eq("id", params.masterProfileId);
  if (e1) return { ok: false as const, message: e1.message };

  const { error: e2 } = await supabase
    .from("master_profiles")
    .update({ paired_master_profile_id: params.masterProfileId })
    .eq("id", found.masterProfileId);
  if (e2) return { ok: false as const, message: e2.message };

  revalidatePath(`/admin/participants/${params.masterProfileId}`);
  return { ok: true as const, pairedName: `${found.firstName} ${found.lastName}` };
}

export async function unpairMasterProfile(masterProfileId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("master_profiles")
    .select("paired_master_profile_id")
    .eq("id", masterProfileId)
    .maybeSingle();

  const { error } = await supabase
    .from("master_profiles")
    .update({ paired_master_profile_id: null })
    .eq("id", masterProfileId);
  if (error) return { ok: false as const, message: error.message };

  if (profile?.paired_master_profile_id) {
    await supabase
      .from("master_profiles")
      .update({ paired_master_profile_id: null })
      .eq("id", profile.paired_master_profile_id);
  }

  revalidatePath(`/admin/participants/${masterProfileId}`);
  return { ok: true as const };
}

export async function setInferredRoleOverride(
  masterProfileId: string,
  role: "visionary" | "integrator" | null,
) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("master_profiles")
    .update({ inferred_role_override: role })
    .eq("id", masterProfileId);
  if (error) return { ok: false as const, message: error.message };

  revalidatePath(`/admin/participants/${masterProfileId}`);
  return { ok: true as const };
}
