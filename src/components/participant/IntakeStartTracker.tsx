"use client";

import { useEffect, useRef } from "react";
import { markIntakeStarted } from "@/lib/actions/intake";

/** Fires once on first render of the intake form -- best-effort analytics
 * timestamp only, nothing in the app reads it back to gate anything. */
export function IntakeStartTracker() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    markIntakeStarted();
  }, []);

  return null;
}
