"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFollowUpStatus } from "@/lib/actions/admin";
import type { FollowUpStatus } from "@/types/database";

const options: FollowUpStatus[] = ["new", "contacted", "closed"];

export function FollowUpStatusSelect({
  followUpId,
  status,
  sessionId,
}: {
  followUpId: string;
  status: FollowUpStatus;
  sessionId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await updateFollowUpStatus({
            followUpId,
            status: e.target.value as FollowUpStatus,
            sessionId,
          });
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
