"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PARTICIPANT_FILES_BUCKET } from "@/lib/data/participantFiles";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB: Vercel rejects request bodies over ~4.5MB

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100);
}

export async function uploadParticipantFile(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const masterProfileId = String(formData.get("masterProfileId") ?? "");
  const label = String(formData.get("label") ?? "").trim() || null;
  const file = formData.get("file");

  if (!masterProfileId) return { ok: false as const, message: "Missing profile." };
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, message: "Choose a file." };
  if (file.size > MAX_FILE_BYTES) return { ok: false as const, message: "File is larger than 4MB." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not authenticated." };

  const filePath = `${masterProfileId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(PARTICIPANT_FILES_BUCKET)
    .upload(filePath, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) return { ok: false as const, message: uploadError.message };

  const { error: insertError } = await supabase.from("participant_files").insert({
    master_profile_id: masterProfileId,
    uploaded_by: user.id,
    file_path: filePath,
    file_name: file.name,
    label,
  });
  if (insertError) {
    // Row didn't get recorded -- don't leave an orphaned, unlisted file
    // sitting in storage with no tracking entry pointing at it.
    await supabase.storage.from(PARTICIPANT_FILES_BUCKET).remove([filePath]);
    return { ok: false as const, message: insertError.message };
  }

  revalidatePath(`/admin/participants/${masterProfileId}`);
  return { ok: true as const };
}

export async function deleteParticipantFile(fileId: string, masterProfileId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: file } = await supabase
    .from("participant_files")
    .select("file_path")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return { ok: false as const, message: "File not found." };

  const { error: deleteRowError } = await supabase.from("participant_files").delete().eq("id", fileId);
  if (deleteRowError) return { ok: false as const, message: deleteRowError.message };

  await supabase.storage.from(PARTICIPANT_FILES_BUCKET).remove([file.file_path]);

  revalidatePath(`/admin/participants/${masterProfileId}`);
  return { ok: true as const };
}
