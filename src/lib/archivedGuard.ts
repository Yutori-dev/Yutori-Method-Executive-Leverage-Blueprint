import { redirect } from "next/navigation";

/**
 * Archived sessions hide their questions but never the finished artifact
 * (client brief 2026-09): anyone landing on a live-session page --
 * dashboard, module, intake, feedback -- for an archived session gets sent
 * to their Blueprint if it was revealed, otherwise back to the portal
 * home. Direct-URL navigation is covered too, not just the missing link.
 */
export function redirectIfArchived(
  dashboard: { session: { status: string; blueprintRevealed: boolean } },
  sessionId: string,
) {
  if (dashboard.session.status !== "archived") return;
  redirect(dashboard.session.blueprintRevealed ? `/dashboard/${sessionId}/blueprint` : "/dashboard");
}
