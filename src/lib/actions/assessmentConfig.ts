"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/** Saves an edited config as a NEW version and makes it current. Older
 * versions are never modified apart from losing the is_current flag, so
 * every historical submission stays tied to the version it was completed
 * under. */
export async function saveAssessmentVersion(assessmentKey: string, rawConfig: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Sign in first." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false as const, message: "Admins only." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfig);
  } catch (e) {
    return { ok: false as const, message: `That isn't valid JSON: ${e instanceof Error ? e.message : "parse error"}` };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false as const, message: "The config must be a JSON object." };
  }

  const { data: assessment } = await supabase.from("structured_assessments").select("id").eq("assessment_key", assessmentKey).maybeSingle();
  if (!assessment) return { ok: false as const, message: "Unknown assessment." };

  const { data: versions } = await supabase
    .from("structured_assessment_versions")
    .select("id, version_number, config")
    .eq("assessment_id", assessment.id);
  const all = versions ?? [];
  const current = all.find((v) => (v.config as { is_current?: boolean })?.is_current === true);
  const next = Math.max(0, ...all.map((v) => v.version_number)) + 1;

  if (current && JSON.stringify({ ...(current.config as object), is_current: undefined, version: undefined }) === JSON.stringify({ ...(parsed as object), is_current: undefined, version: undefined })) {
    return { ok: false as const, message: "No changes to save." };
  }

  // Flip the old version first (partial unique index allows one current).
  if (current) {
    const { error } = await supabase
      .from("structured_assessment_versions")
      .update({ config: { ...(current.config as object), is_current: false } as Json })
      .eq("id", current.id);
    if (error) return { ok: false as const, message: error.message };
  }
  const { error: insertError } = await supabase.from("structured_assessment_versions").insert({
    assessment_id: assessment.id,
    version_number: next,
    config: { ...(parsed as object), is_current: true, version: next } as Json,
    created_by: user.id,
  });
  if (insertError) {
    // Restore the previous current version so the assessment never ends up without one.
    if (current) await supabase.from("structured_assessment_versions").update({ config: current.config }).eq("id", current.id);
    return { ok: false as const, message: insertError.message };
  }

  revalidatePath("/admin/assessment-config");
  revalidatePath(`/admin/assessment-config/${assessmentKey}`);
  return { ok: true as const, version: next };
}
