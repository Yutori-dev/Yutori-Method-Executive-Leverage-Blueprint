/** Shared "Current Executive Support" formatting -- used by the admin
 * roster, the participant detail page, CSV export, and the Blueprint, so
 * the readable label format (client spec round 4, section 8: "Executive
 * Assistant · Chief of Staff") can't drift between call sites. */
export interface CurrentSupportFlags {
  currentSupportPersonalAssistant: boolean;
  currentSupportAdminOrVa: boolean;
  currentSupportExecutiveAssistant: boolean;
  currentSupportSeniorExecutiveAssistant: boolean;
  currentSupportHeadOfOperations: boolean;
  currentSupportChiefOfStaff: boolean;
  currentSupportChiefIntegrator: boolean;
  currentSupportCoo: boolean;
  currentSupportOther: boolean;
  currentSupportOtherText: string | null;
  currentSupportNone: boolean;
}

const LABELS: { key: keyof CurrentSupportFlags; label: string }[] = [
  { key: "currentSupportPersonalAssistant", label: "Personal Assistant" },
  { key: "currentSupportAdminOrVa", label: "Administrative Assistant / Virtual Assistant" },
  { key: "currentSupportExecutiveAssistant", label: "Executive Assistant" },
  { key: "currentSupportSeniorExecutiveAssistant", label: "Senior Executive Assistant" },
  { key: "currentSupportHeadOfOperations", label: "Head of Operations" },
  { key: "currentSupportChiefOfStaff", label: "Chief of Staff" },
  { key: "currentSupportChiefIntegrator", label: "Chief Integrator" },
  { key: "currentSupportCoo", label: "COO" },
];

export function currentSupportRoleLabels(flags: CurrentSupportFlags): string[] {
  const roles = LABELS.filter((l) => flags[l.key]).map((l) => l.label);
  if (flags.currentSupportOther) {
    roles.push(flags.currentSupportOtherText ? `Other: ${flags.currentSupportOtherText}` : "Other");
  }
  return roles;
}

export function formatCurrentSupport(flags: CurrentSupportFlags): string {
  if (flags.currentSupportNone) return "None of the above";
  const roles = currentSupportRoleLabels(flags);
  return roles.length > 0 ? roles.join(" · ") : "Not yet provided";
}
