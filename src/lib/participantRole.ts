import { inferRoleFromTitle, type InferredRole } from "@/lib/inferRole";

export interface RoleHints {
  role_override: string | null;
  self_identified_role: string | null;
  current_role_title: string | null;
}

const asRole = (v: string | null | undefined): InferredRole | null =>
  v === "visionary" || v === "integrator" ? v : null;

/**
 * Which kind of participant this is, for modules restricted to one audience.
 * An admin's explicit override wins, then what the person said about
 * themselves at sign-up, then a guess from their job title. null means
 * unknown -- such a person only sees modules meant for everyone.
 */
export function resolveParticipantRole(hints: RoleHints | null | undefined): InferredRole | null {
  if (!hints) return null;
  return (
    asRole(hints.role_override) ?? asRole(hints.self_identified_role) ?? inferRoleFromTitle(hints.current_role_title)
  );
}

export function moduleVisibleToRole(audience: string, role: InferredRole | null): boolean {
  return audience === "everyone" || audience === role;
}
