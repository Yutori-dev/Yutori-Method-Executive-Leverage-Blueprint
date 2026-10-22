"use client";

import { useEffect, useRef } from "react";

/** Scrolls the window to the top whenever `key` changes (a new step or screen
 * inside a flow that doesn't navigate). Does nothing on first render. */
export function useScrollToTop(key: unknown) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [key]);
}
