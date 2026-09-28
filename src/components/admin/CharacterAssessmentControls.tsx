"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  matchCharacterAssessment,
  uploadCharacterReport,
  setCharacterReportReleased,
} from "@/lib/actions/characterAssessments";
import { Button } from "@/components/ui/Button";

/** Per-assessment admin actions: match to a participant, attach the finished
 * report PDF, release it to the participant's portal. */
export function CharacterAssessmentControls({
  id,
  matched,
  reportFileName,
  reportDownloadUrl,
  released,
  defaultEmail,
}: {
  id: string;
  matched: boolean;
  reportFileName: string | null;
  reportDownloadUrl: string | null;
  released: boolean;
  defaultEmail: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message ?? "Something went wrong.");
      else router.refresh();
    });
  }

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF first.");
      return;
    }
    const formData = new FormData();
    formData.set("id", id);
    formData.set("file", file);
    run(async () => {
      const result = await uploadCharacterReport(formData);
      if (result.ok && fileInputRef.current) fileInputRef.current.value = "";
      return result;
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium">1. Participant</h3>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          {matched
            ? "Matched. To move it to a different person, enter their registered email."
            : "Not matched yet. Enter the email the participant registered with."}
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="participant@email.com"
            className="min-w-0 flex-1 rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
          <Button onClick={() => run(() => matchCharacterAssessment(id, email))} disabled={isPending || !email.trim()}>
            {matched ? "Re-match" : "Match"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">2. Report (PDF)</h3>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          Automatic report generation is added once the report requirements arrive. Until then, attach a finished PDF here.
        </p>
        {reportFileName ? (
          <p className="mt-2 text-sm">
            Attached:{" "}
            {reportDownloadUrl ? (
              <a href={reportDownloadUrl} className="text-(--color-accent) hover:underline">
                {reportFileName}
              </a>
            ) : (
              reportFileName
            )}
          </p>
        ) : null}
        <div className="mt-2 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={!matched}
            className="block w-full text-sm text-(--color-ink-muted) file:mr-3 file:rounded-full file:border file:border-(--color-hairline) file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-(--color-ink)"
          />
          <Button onClick={handleUpload} disabled={isPending || !matched}>
            {reportFileName ? "Replace report" : "Attach report"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">3. Show in the participant&apos;s portal</h3>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          {released ? "Visible to the participant next to their Blueprint." : "Hidden from the participant until released."}
        </p>
        <div className="mt-2">
          <Button onClick={() => run(() => setCharacterReportReleased(id, !released))} disabled={isPending || (!released && !reportFileName)}>
            {released ? "Hide from participant" : "Release to participant"}
          </Button>
        </div>
      </section>

      {error ? <p className="text-sm text-[#8a3324]">{error}</p> : null}
    </div>
  );
}
