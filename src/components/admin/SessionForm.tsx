"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession, updateSession } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import type { SessionFormat } from "@/types/database";

export function SessionForm({
  mode,
  sessionId,
  initial,
}: {
  mode: "create" | "edit";
  sessionId?: string;
  initial?: { name: string; organization: string; eventDate: string; format: SessionFormat };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [organization, setOrganization] = useState(initial?.organization ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? "");
  const [format, setFormat] = useState<SessionFormat>(initial?.format ?? "virtual");

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (mode === "create") {
          const newId = await createSession({ name, organization, eventDate, format });
          router.push(`/admin/sessions/${newId}`);
        } else if (sessionId) {
          await updateSession(sessionId, { name, organization, eventDate, format });
          router.push(`/admin/sessions/${sessionId}`);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-(--color-ink-muted)">
          Session name
        </label>
        <input
          id="name"
          required
          placeholder="St. Louis YPO Gold — October 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>
      <div>
        <label htmlFor="organization" className="block text-xs font-medium text-(--color-ink-muted)">
          Organization / chapter
        </label>
        <input
          id="organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="eventDate" className="block text-xs font-medium text-(--color-ink-muted)">
            Event date
          </label>
          <input
            id="eventDate"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
        <div>
          <label htmlFor="format" className="block text-xs font-medium text-(--color-ink-muted)">
            Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as SessionFormat)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          >
            <option value="virtual">Virtual</option>
            <option value="in_person">In person</option>
          </select>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : mode === "create" ? "Create session" : "Save changes"}
      </Button>
    </form>
  );
}
