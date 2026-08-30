"use client";

import { useState, useTransition } from "react";
import { saveWorkshopFeedbackSettings } from "@/lib/actions/workshopFeedbackSettings";
import { Button } from "@/components/ui/Button";

export function WorkshopFeedbackSettingsForm({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveWorkshopFeedbackSettings(url);
      setMessage(result.ok ? "Saved." : result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="diagnosticFollowUpUrl" className="block text-xs font-medium text-(--color-ink-muted)">
          Diagnostic follow-up link
        </label>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          Shown on the thank-you screen after a participant submits workshop feedback
          (&ldquo;submit your diagnostic and we will follow up with you&rdquo;). Leave blank to
          hide that line.
        </p>
        <input
          id="diagnosticFollowUpUrl"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        {message ? <p className="text-sm text-(--color-ink-muted)">{message}</p> : null}
      </div>
    </form>
  );
}
