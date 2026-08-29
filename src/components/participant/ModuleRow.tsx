import Link from "next/link";
import type { DashboardModule } from "@/lib/data/participantDashboard";
import { ModuleStateBadge } from "@/components/ui/ModuleStateBadge";
import { cn } from "@/lib/cn";

function LockGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 text-(--color-locked)"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function ModuleRow({
  module,
  sessionId,
  index,
  isReachable,
}: {
  module: DashboardModule;
  sessionId: string;
  index: number;
  /** Guided-progression model: a module is only clickable once the
   * participant has actually reached it (it's their current step) or
   * already finished it -- being cohort-unlocked isn't enough on its own,
   * since a late joiner may have several modules cohort-unlocked at once
   * (see resolveParticipantDestination in src/lib/moduleState.ts). */
  isReachable: boolean;
}) {
  const isLocked = module.state === "LOCKED";
  const isDimmed = isLocked || !isReachable;
  const isInteractive = isReachable;

  const content = (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-colors",
        isDimmed
          ? "border-(--color-hairline) bg-transparent"
          : "border-(--color-hairline) bg-(--color-paper-raised) hover:border-(--color-accent)",
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "font-serif text-lg italic",
            isDimmed ? "text-(--color-locked)" : "text-(--color-accent)",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <p className={cn("font-medium", isDimmed && "text-(--color-ink-muted)")}>
            {module.name}
          </p>
          {module.requiresLiveWorkshop ? (
            <p className="mt-0.5 text-xs text-(--color-ink-muted)">Unlocks in the live workshop</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isLocked ? <LockGlyph /> : null}
        <ModuleStateBadge state={module.state} />
      </div>
    </div>
  );

  if (!isInteractive) {
    return content;
  }

  return (
    <Link href={`/dashboard/${sessionId}/modules/${module.key}`} className="block">
      {content}
    </Link>
  );
}
