import type { ModuleStatus } from "@/types/database";

/**
 * The four required module states (brief section 8), plus the two states
 * the schema/UI already accommodate for the later architecture reveal
 * milestone. Milestone 1 never produces READY_TO_REVEAL or REVEALED --
 * they exist here only so the type and the switch statements that render
 * module state don't need to change shape when that logic arrives.
 */
export type ModuleDisplayState =
  | "LOCKED"
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "READY_TO_REVEAL"
  | "REVEALED";

export function deriveModuleState(params: {
  moduleSortOrder: number;
  requiresLiveWorkshop: boolean;
  cohortActiveModuleSortOrder: number | null;
  participantStatus: ModuleStatus | null;
}): ModuleDisplayState {
  const { moduleSortOrder, requiresLiveWorkshop, cohortActiveModuleSortOrder, participantStatus } =
    params;

  if (requiresLiveWorkshop) {
    return "LOCKED";
  }

  const isCohortUnlocked =
    cohortActiveModuleSortOrder !== null && moduleSortOrder <= cohortActiveModuleSortOrder;

  if (!isCohortUnlocked) {
    return "LOCKED";
  }

  switch (participantStatus) {
    case "complete":
      return "COMPLETE";
    case "in_progress":
      return "IN_PROGRESS";
    default:
      return "OPEN";
  }
}

export type ParticipantDestination =
  | { type: "context" }
  | { type: "module"; moduleKey: string }
  | { type: "holding" }
  | { type: "all-done" };

/**
 * Single source of truth for "where should this participant be right now."
 * Guided-progression model (client spec): a participant advances through
 * required activities in order, starting at the first one -- a late joiner
 * who arrives after the facilitator has cohort-unlocked several modules
 * still starts at their own first incomplete module, not whatever the
 * cohort has already reached. Used both to drive the dashboard's single
 * CONTINUE call-to-action and to guard direct module-page navigation
 * server-side (see the module page's LOCKED check, which this extends).
 */
export function resolveParticipantDestination(
  contextDone: boolean,
  modules: { key: string; state: ModuleDisplayState; requiresLiveWorkshop: boolean; sortOrder: number }[],
): ParticipantDestination {
  if (!contextDone) return { type: "context" };

  const trackedModules = [...modules]
    .filter((m) => !m.requiresLiveWorkshop)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const firstIncomplete = trackedModules.find((m) => m.state !== "COMPLETE");

  if (!firstIncomplete) return { type: "all-done" };
  if (firstIncomplete.state === "LOCKED") return { type: "holding" };
  return { type: "module", moduleKey: firstIncomplete.key };
}
