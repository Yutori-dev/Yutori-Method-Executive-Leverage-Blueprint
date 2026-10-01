"use client";

import { useState, useTransition } from "react";
import { saveAssessmentVersion } from "@/lib/actions/assessmentConfig";

export function AssessmentConfigEditor({ assessmentKey, initial, version }: { assessmentKey: string; initial: string; version: number }) {
  const [text, setText] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await saveAssessmentVersion(assessmentKey, text);
      setMessage(r.ok ? { ok: true, text: `Saved as version ${r.version}. New participants get it now; earlier submissions keep the version they completed.` } : { ok: false, text: r.message });
    });
  }

  return (
    <div>
      <p className="text-xs text-(--color-ink-muted)">Editing from version {version}. Saving creates a new version; nothing already submitted changes.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="mt-3 h-[60vh] w-full rounded-xl border border-(--color-hairline) bg-transparent p-3 font-mono text-xs"
      />
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-full border border-(--color-hairline) px-4 py-1.5 text-sm font-medium hover:border-(--color-accent) disabled:opacity-50">
          {pending ? "Saving…" : "Save as new version"}
        </button>
        {message ? <span className={`text-sm ${message.ok ? "text-(--color-ink)" : "text-red-600"}`}>{message.text}</span> : null}
      </div>
    </div>
  );
}
