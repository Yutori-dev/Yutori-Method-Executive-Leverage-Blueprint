"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/parseCsv";
import { PARTICIPANT_FILES_BUCKET } from "@/lib/data/participantFiles";

const MAX_CSV_BYTES = 4 * 1024 * 1024;
const MAX_REPORT_BYTES = 4 * 1024 * 1024;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null as string | null };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { supabase, userId: isAdmin ? user.id : null };
}

/** LimeSurvey stamps submitdate only on completed responses; a blank one
 * means the person stopped partway. */
function toIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function importCharacterAssessmentCsv(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false as const, message: "Admins only." };

  const file = formData.get("file");
  const emailColumnInput = String(formData.get("emailColumn") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, message: "Choose a CSV file." };
  if (file.size > MAX_CSV_BYTES) return { ok: false as const, message: "CSV is larger than 4MB -- split the export." };

  const { headers, rows } = parseCsv(await file.text());
  if (headers.length === 0 || rows.length === 0) return { ok: false as const, message: "That file has no data rows." };

  const findHeader = (wanted: string) => headers.find((h) => h.toLowerCase() === wanted.toLowerCase());
  const emailColumn = emailColumnInput
    ? headers.find((h) => h.toLowerCase() === emailColumnInput.toLowerCase())
    : headers.find((h) => /e-?mail/i.test(h));
  if (!emailColumn) {
    const found = `${headers.slice(0, 12).join(", ")}${headers.length > 12 ? ", ..." : ""}`;
    return {
      ok: false as const,
      message: emailColumnInput
        ? `No column named "${emailColumnInput}". Columns found: ${found}`
        : `Couldn't find an email column automatically. Enter its exact name. Columns found: ${found}`,
    };
  }
  const idColumn = findHeader("id") ?? findHeader("Response ID");
  const submitColumn = findHeader("submitdate") ?? findHeader("Date submitted");

  let skippedIncomplete = 0;
  const prepared: { importKey: string; email: string | null; completedAt: string | null; row: Record<string, string> }[] = [];
  for (const row of rows) {
    if (submitColumn && !row[submitColumn]?.trim()) {
      skippedIncomplete++;
      continue;
    }
    const email = (row[emailColumn] ?? "").trim().toLowerCase();
    const completedAt = submitColumn ? toIso(row[submitColumn] ?? "") : null;
    const importKey =
      idColumn && row[idColumn]?.trim()
        ? `ls:${row[idColumn].trim()}`
        : email || completedAt
          ? `${email}|${completedAt ?? ""}`
          : `row:${createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 32)}`;
    prepared.push({ importKey, email: email || null, completedAt, row });
  }

  // Match each email to a registration (exact, lowercased).
  const emails = [...new Set(prepared.map((p) => p.email).filter((e): e is string => !!e))];
  const profileByEmail = new Map<string, string>();
  for (const part of chunk(emails, 50)) {
    const { data } = await supabase.from("participants").select("email, master_profile_id").in("email", part);
    for (const p of data ?? []) profileByEmail.set(p.email.toLowerCase(), p.master_profile_id);
  }

  // Skip rows already imported, but let a re-upload rescue previously unmatched ones.
  const existingByKey = new Map<string, { id: string; master_profile_id: string | null }>();
  for (const part of chunk(prepared.map((p) => p.importKey), 50)) {
    const { data } = await supabase.from("character_assessments").select("id, import_key, master_profile_id").in("import_key", part);
    for (const e of data ?? []) existingByKey.set(e.import_key, e);
  }

  let imported = 0;
  let duplicates = 0;
  let rematched = 0;
  const toInsert: {
    import_key: string;
    master_profile_id: string | null;
    source_email: string | null;
    source_completed_at: string | null;
    imported_by: string;
    raw_responses: Record<string, string>;
  }[] = [];
  const seenKeys = new Set<string>();
  for (const p of prepared) {
    const masterProfileId = p.email ? (profileByEmail.get(p.email) ?? null) : null;
    const existing = existingByKey.get(p.importKey);
    if (existing || seenKeys.has(p.importKey)) {
      duplicates++;
      if (existing && !existing.master_profile_id && masterProfileId) {
        const { error } = await supabase.from("character_assessments").update({ master_profile_id: masterProfileId }).eq("id", existing.id);
        if (!error) rematched++;
      }
      continue;
    }
    seenKeys.add(p.importKey);
    toInsert.push({
      import_key: p.importKey,
      master_profile_id: masterProfileId,
      source_email: p.email,
      source_completed_at: p.completedAt,
      imported_by: userId,
      raw_responses: p.row,
    });
  }

  for (const part of chunk(toInsert, 100)) {
    const { error } = await supabase.from("character_assessments").upsert(part, { onConflict: "import_key", ignoreDuplicates: true });
    if (error) return { ok: false as const, message: `Import stopped partway: ${error.message}` };
    imported += part.length;
  }

  revalidatePath("/admin/character-assessments");
  return {
    ok: true as const,
    imported,
    duplicates,
    rematched,
    skippedIncomplete,
    unmatched: toInsert.filter((r) => !r.master_profile_id).length,
    emailColumn,
  };
}

export async function matchCharacterAssessment(id: string, email: string) {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false as const, message: "Admins only." };

  const { data: person } = await supabase
    .from("participants")
    .select("master_profile_id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (!person) return { ok: false as const, message: "No participant registered with that email." };

  const { data, error } = await supabase
    .from("character_assessments")
    .update({ master_profile_id: person.master_profile_id })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false as const, message: error?.message ?? "Could not update." };

  revalidatePath("/admin/character-assessments");
  revalidatePath(`/admin/character-assessments/${id}`);
  return { ok: true as const };
}

export async function uploadCharacterReport(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false as const, message: "Admins only." };

  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, message: "Choose a PDF." };
  if (file.size > MAX_REPORT_BYTES) return { ok: false as const, message: "File is larger than 4MB." };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false as const, message: "The report must be a PDF." };
  }

  const { data: row } = await supabase
    .from("character_assessments")
    .select("master_profile_id, report_file_path")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const, message: "Assessment not found." };
  if (!row.master_profile_id) return { ok: false as const, message: "Match this assessment to a participant first." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100);
  const filePath = `${row.master_profile_id}/character-${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(PARTICIPANT_FILES_BUCKET)
    .upload(filePath, file, { contentType: "application/pdf" });
  if (uploadError) return { ok: false as const, message: uploadError.message };

  const { data: updated, error } = await supabase
    .from("character_assessments")
    .update({ report_file_path: filePath, report_file_name: file.name })
    .eq("id", id)
    .select("id");
  if (error || !updated?.length) {
    await supabase.storage.from(PARTICIPANT_FILES_BUCKET).remove([filePath]);
    return { ok: false as const, message: error?.message ?? "Could not save the report." };
  }
  if (row.report_file_path) await supabase.storage.from(PARTICIPANT_FILES_BUCKET).remove([row.report_file_path]);

  revalidatePath(`/admin/character-assessments/${id}`);
  return { ok: true as const };
}

export async function setCharacterReportReleased(id: string, released: boolean) {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false as const, message: "Admins only." };

  const { data: row } = await supabase
    .from("character_assessments")
    .select("master_profile_id, report_file_path")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const, message: "Assessment not found." };
  if (released && (!row.master_profile_id || !row.report_file_path)) {
    return { ok: false as const, message: "Match a participant and attach the report before releasing." };
  }

  const { data, error } = await supabase
    .from("character_assessments")
    .update({ released_to_participant: released, released_at: released ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false as const, message: error?.message ?? "Could not update." };

  revalidatePath(`/admin/character-assessments/${id}`);
  revalidatePath("/admin/character-assessments");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
