"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadParticipantFile, deleteParticipantFile } from "@/lib/actions/participantFiles";
import { Button } from "@/components/ui/Button";

interface FileRow {
  id: string;
  fileName: string;
  label: string | null;
  uploadedAt: string;
  downloadUrl: string | null;
}

/** Admin-side upload + list for a person's profile (client brief item 6) --
 * files show up in the participant's own portal once uploaded. */
export function ParticipantFilesControl({
  masterProfileId,
  files,
}: {
  masterProfileId: string;
  files: FileRow[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setErrorMessage("Choose a file first.");
      return;
    }
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("masterProfileId", masterProfileId);
    formData.set("label", label);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadParticipantFile(formData);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div>
      <div className="space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-(--color-ink-muted)">No files uploaded yet.</p>
        ) : (
          files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-(--color-hairline) px-3 py-2">
              <div className="min-w-0">
                {f.downloadUrl ? (
                  <a href={f.downloadUrl} className="truncate text-sm text-(--color-accent) hover:underline">
                    {f.label || f.fileName}
                  </a>
                ) : (
                  <p className="truncate text-sm text-(--color-ink)">{f.label || f.fileName}</p>
                )}
                <p className="text-xs text-(--color-ink-muted)">
                  {f.fileName} · {new Date(f.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteParticipantFile(f.id, masterProfileId);
                    router.refresh();
                  })
                }
                className="shrink-0 text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-[#8a3324]"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-(--color-hairline) pt-4">
        <input
          ref={fileInputRef}
          type="file"
          className="block w-full text-sm text-(--color-ink-muted) file:mr-3 file:rounded-full file:border file:border-(--color-hairline) file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-(--color-ink)"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional, e.g. Character Profile Report)"
          className="w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
        {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}
        <Button onClick={handleUpload} disabled={isPending}>
          {isPending ? "Uploading..." : "Upload file"}
        </Button>
      </div>
    </div>
  );
}
