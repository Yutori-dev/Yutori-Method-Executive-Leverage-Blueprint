"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markModuleStarted } from "@/lib/actions/participant";

/**
 * Fires the OPEN -> IN_PROGRESS transition as a real Server Action instead
 * of a side effect during the page's own render.
 *
 * The previous approach mutated the database directly inside the Server
 * Component's render path with no `revalidatePath()` call. That's not just
 * an anti-pattern -- it's why the dashboard kept showing a module as OPEN
 * after a participant had already opened it, until a manual refresh:
 * nothing ever told Next.js's client-side router cache that the dashboard
 * route's data had changed, so navigating back to it served the cached
 * (stale) payload. Routing this through a Server Action + revalidatePath
 * (the same pattern every other mutation in this app already uses) fixes
 * that; router.refresh() additionally updates this page's own badge
 * immediately instead of showing "Open" for a beat after it's actually
 * "In progress".
 */
export function ModuleStartTracker({
  shouldTrack,
  participantSessionId,
  moduleId,
  moduleKey,
  sessionPath,
}: {
  shouldTrack: boolean;
  participantSessionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
}) {
  const router = useRouter();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!shouldTrack || firedRef.current) return;
    firedRef.current = true;

    markModuleStarted({ participantSessionId, moduleId, moduleKey, sessionPath }).then(() => {
      router.refresh();
    });
  }, [shouldTrack, participantSessionId, moduleId, moduleKey, sessionPath, router]);

  return null;
}
