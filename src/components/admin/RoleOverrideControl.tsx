"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setInferredRoleOverride } from "@/lib/actions/masterProfile";
import { cn } from "@/lib/cn";

/** "In the database need to see who is visionary and who is integrator" --
 * inferred from title automatically, admin can override. Not the real
 * Leadership Wiring assessment (that stays a per-session result); this is
 * a separate, person-level classification for search/filter and pairing. */
export function RoleOverrideControl({
  masterProfileId,
  inferredRole,
  override,
}: {
  masterProfileId: string;
  inferredRole: "visionary" | "integrator" | null;
  override: "visionary" | "integrator" | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const effective = override ?? inferredRole;

  function set(role: "visionary" | "integrator" | null) {
    startTransition(async () => {
      await setInferredRoleOverride(masterProfileId, role);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {(["visionary", "integrator"] as const).map((role) => (
        <button
          key={role}
          type="button"
          disabled={isPending}
          onClick={() => set(effective === role ? null : role)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-60",
            effective === role
              ? "border-(--color-accent) bg-(--color-accent-soft) text-(--color-ink)"
              : "border-(--color-hairline) text-(--color-ink-muted) hover:border-(--color-accent)",
          )}
        >
          {role}
        </button>
      ))}
      {override ? (
        <span className="text-xs text-(--color-ink-muted)">(manually set)</span>
      ) : inferredRole ? (
        <span className="text-xs text-(--color-ink-muted)">(inferred from title)</span>
      ) : null}
    </div>
  );
}
