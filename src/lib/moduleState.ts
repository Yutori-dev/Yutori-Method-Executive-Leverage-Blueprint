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
  /** EA Experience Assessment's spec ("the participant does not need to
   * complete any other activity before accessing it") is a genuine
   * exception to the guided-progression model every other module follows
   * -- it skips the facilitator's cohort-wide reveal entirely. Driven by
   * ALWAYS_UNLOCKED_MODULE_KEYS below rather than threaded through every
   * call site. */
  alwaysUnlocked?: boolean;
}): ModuleDisplayState {
  const { moduleSortOrder, requiresLiveWorkshop, cohortActiveModuleSortOrder, participantStatus, alwaysUnlocked } =
    params;

  if (requiresLiveWorkshop) {
    return "LOCKED";
  }

  const isCohortUnlocked =
    alwaysUnlocked ||
    (cohortActiveModuleSortOrder !== null && moduleSortOrder <= cohortActiveModuleSortOrder);

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

/** See deriveModuleState's alwaysUnlocked param. */
export const ALWAYS_UNLOCKED_MODULE_KEYS = new Set(["ea_experience_assessment"]);

export type ParticipantDestination =
  | { type: "context" }
  | { type: "module"; moduleKey: string }
  | { type: "holding" }
  | { type: "final-feedback" }
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
  workshopFeedback?: { released: boolean; submitted: boolean },
): ParticipantDestination {
  // Client spec: the EA Experience Assessment is the expanded intake and
  // must be available immediately on first login, before any other
  // activity (including the intake form). Only applies while it is enabled
  // for the session (disabled modules are filtered out upstream) and not
  // yet completed.
  const earlyModule = modules.find((m) => ALWAYS_UNLOCKED_MODULE_KEYS.has(m.key) && !m.requiresLiveWorkshop && m.state !== "COMPLETE");
  if (earlyModule) return { type: "module", moduleKey: earlyModule.key };

  if (!contextDone) return { type: "context" };

  const trackedModules = [...modules]
    .filter((m) => !m.requiresLiveWorkshop)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const firstIncomplete = trackedModules.find((m) => m.state !== "COMPLETE");

  if (!firstIncomplete) {
    if (workshopFeedback?.released && !workshopFeedback.submitted) return { type: "final-feedback" };
    return { type: "all-done" };
  }
  if (firstIncomplete.state === "LOCKED") return { type: "holding" };
  return { type: "module", moduleKey: firstIncomplete.key };
}
