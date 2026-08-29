"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSessionStatus } from "@/lib/actions/admin";
import type { SessionStatus } from "@/types/database";

const options: SessionStatus[] = ["draft", "active", "complete", "archived"];

export function SessionStatusSelect({
  sessionId,
  status,
}: {
  sessionId: string;
  status: SessionStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await updateSessionStatus(sessionId, e.target.value as SessionStatus);
          router.refresh();
        })
      }
      className="rounded-lg border border-(--color-hairline) bg-transparent px-3 py-1.5 text-xs uppercase tracking-wide outline-none focus:border-(--color-accent)"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
