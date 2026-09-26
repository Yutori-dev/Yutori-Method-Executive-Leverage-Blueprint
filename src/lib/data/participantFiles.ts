import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const PARTICIPANT_FILES_BUCKET = "participant-files";

export interface ParticipantFile {
  id: string;
  fileName: string;
  label: string | null;
  uploadedAt: string;
  filePath: string;
}

export async function getParticipantFiles(masterProfileId: string): Promise<ParticipantFile[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("participant_files")
    .select("id, file_name, label, uploaded_at, file_path")
    .eq("master_profile_id", masterProfileId)
    .order("uploaded_at", { ascending: false });

  return (data ?? []).map((f) => ({
    id: f.id,
    fileName: f.file_name,
    label: f.label,
    uploadedAt: f.uploaded_at,
    filePath: f.file_path,
  }));
}

/** For the participant portal: files across every session under the
 * caller's own master profile, same "resolved through merged
 * registrations" pattern as getPortalSessions. */
export async function getMyFiles(): Promise<ParticipantFile[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: me } = await supabase
    .from("participants")
    .select("master_profile_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me) return [];

  return getParticipantFiles(me.master_profile_id);
}

export async function getSignedFileUrl(filePath: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from(PARTICIPANT_FILES_BUCKET)
    .createSignedUrl(filePath, 60 * 5);
  if (error) return null;
  return data.signedUrl;
}
