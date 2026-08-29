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
