"use client";

import { useEffect, useRef } from "react";
import { markZoneOfInvestmentViewed } from "@/lib/actions/zone";

/** Fires once, first time the revealed personalized matrix renders -- see
 * ModuleStartTracker.tsx for the same pattern applied elsewhere. */
export function ZoneOfInvestmentViewedTracker({
  shouldTrack,
  participantSessionId,
}: {
  shouldTrack: boolean;
  participantSessionId: string;
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!shouldTrack || firedRef.current) return;
    firedRef.current = true;
    void markZoneOfInvestmentViewed({ participantSessionId });
  }, [shouldTrack, participantSessionId]);

  return null;
}
