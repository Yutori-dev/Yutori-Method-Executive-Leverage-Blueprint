import type { ModuleDisplayState } from "@/lib/moduleState";
import { cn } from "@/lib/cn";

const labels: Record<ModuleDisplayState, string> = {
  LOCKED: "Locked",
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  READY_TO_REVEAL: "Ready to reveal",
  REVEALED: "Revealed",
};

const classes: Record<ModuleDisplayState, string> = {
  LOCKED: "bg-transparent text-(--color-locked) border border-(--color-locked)",
  OPEN: "bg-(--color-accent-soft) text-(--color-accent)",
  IN_PROGRESS: "bg-(--color-accent) text-(--color-paper)",
  COMPLETE: "bg-(--color-success) text-white",
  READY_TO_REVEAL: "bg-(--color-accent-soft) text-(--color-accent)",
  REVEALED: "bg-(--color-success) text-white",
};

export function ModuleStateBadge({ state }: { state: ModuleDisplayState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase",
        classes[state],
      )}
    >
      {labels[state]}
    </span>
  );
}
