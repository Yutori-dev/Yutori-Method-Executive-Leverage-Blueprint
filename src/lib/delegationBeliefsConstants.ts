export type DelegationDomain = "trust_control" | "team_outcomes" | "workload_resources";

export const DOMAIN_LABEL: Record<DelegationDomain, string> = {
  trust_control: "Trust & Control",
  team_outcomes: "Team & Outcomes",
  workload_resources: "Workload & Resources",
};
