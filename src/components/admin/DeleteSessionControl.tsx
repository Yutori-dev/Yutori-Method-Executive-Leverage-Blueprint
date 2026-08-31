"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSession } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function DeleteSessionControl({ sessionId, sessionName }: { sessionId: string; sessionName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete session
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-[#8a3324] bg-[#8a3324]/10 p-4">
      <p className="text-sm text-(--color-ink)">
        This permanently deletes <span className="font-medium">{sessionName}</span> and every
        participant&apos;s data within it -- responses, ratings, priorities, results, everything.
        This cannot be undone.
      </p>
      <p className="mt-3 text-xs font-medium text-(--color-ink-muted) uppercase">
        Type DELETE to confirm
      </p>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        placeholder="DELETE"
      />
      {errorMessage ? <p className="mt-2 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            setConfirming(false);
            setConfirmText("");
            setErrorMessage(null);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={confirmText !== "DELETE" || isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteSession(sessionId);
              if (!result.ok) {
                setErrorMessage(result.message);
                return;
              }
              router.push("/admin");
            })
          }
        >
          {isPending ? "Deleting..." : "Permanently delete"}
        </Button>
      </div>
    </div>
  );
}
