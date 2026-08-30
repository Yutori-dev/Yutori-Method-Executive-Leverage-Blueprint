import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";
import type { LeverageLevel } from "@/types/database";

export const LEVEL_LABEL: Record<LeverageLevel, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

const WHAT_THIS_MEANS_KEY: Record<LeverageLevel, keyof ExecutiveSupportArchitectureConfigInput> = {
  execution: "whatThisMeansExecution",
  orchestration: "whatThisMeansOrchestration",
  strategic: "whatThisMeansStrategic",
  systems: "whatThisMeansSystems",
};

const ACTION_COPY_KEY: Record<string, keyof ExecutiveSupportArchitectureConfigInput> = {
  strengthen_execution: "strengthenExecutionCopy",
  add_execution: "addExecutionCopy",
  strengthen_orchestration: "strengthenOrchestrationCopy",
  evolve_or_add_orchestration: "evolveOrAddOrchestrationCopy",
  add_orchestration: "addOrchestrationCopy",
  strengthen_strategic: "strengthenStrategicCopy",
  add_strategic_from_orchestration: "addStrategicFromOrchestrationCopy",
  add_strategic: "addStrategicCopy",
  strengthen_systems: "strengthenSystemsCopy",
  add_systems: "addSystemsCopy",
};

export function whatThisMeansCopy(level: LeverageLevel, config: ExecutiveSupportArchitectureConfigInput): string {
  return config[WHAT_THIS_MEANS_KEY[level]];
}

export function actionCopy(actionCode: string | null, config: ExecutiveSupportArchitectureConfigInput): string {
  const key = actionCode ? ACTION_COPY_KEY[actionCode] : undefined;
  return key ? config[key] : "";
}

export function withLevel(template: string, level: LeverageLevel): string {
  return template.replaceAll("{level}", LEVEL_LABEL[level]);
}
