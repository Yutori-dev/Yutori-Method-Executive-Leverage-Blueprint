"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importCharacterAssessmentCsv } from "@/lib/actions/characterAssessments";
import { Button } from "@/components/ui/Button";

/** Upload a LimeSurvey CSV export; each completed row is matched to a
 * participant by email and stored. Re-uploading the same export is safe --
 * rows already imported are skipped. */
export function CharacterAssessmentImportForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailColumn, setEmailColumn] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage({ ok: false, text: "Choose a CSV file first." });
      return;
    }
    setMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("emailColumn", emailColumn);

    startTransition(async () => {
      const result = await importCharacterAssessmentCsv(formData);
      if (!result.ok) {
        setMessage({ ok: false, text: result.message });
        return;
      }
      const parts = [
        `${result.imported} imported`,
        result.unmatched > 0 ? `${result.unmatched} not matched to a participant (match them below)` : null,
        result.duplicates > 0 ? `${result.duplicates} already imported${result.rematched > 0 ? ` (${result.rematched} newly matched)` : ""}` : null,
        result.skippedIncomplete > 0 ? `${result.skippedIncomplete} incomplete responses skipped` : null,
      ].filter(Boolean);
      setMessage({ ok: true, text: `${parts.join(" · ")}. Email column used: "${result.emailColumn}".` });
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="block w-full text-sm text-(--color-ink-muted) file:mr-3 file:rounded-full file:border file:border-(--color-hairline) file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-(--color-ink)"
      />
      <input
        value={emailColumn}
        onChange={(e) => setEmailColumn(e.target.value)}
        placeholder="Email column name (optional -- detected automatically)"
        className="w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
      />
      {message ? (
        <p className={`text-sm ${message.ok ? "text-(--color-ink)" : "text-[#8a3324]"}`}>{message.text}</p>
      ) : null}
      <Button onClick={handleImport} disabled={isPending}>
        {isPending ? "Importing..." : "Import CSV"}
      </Button>
    </div>
  );
}
