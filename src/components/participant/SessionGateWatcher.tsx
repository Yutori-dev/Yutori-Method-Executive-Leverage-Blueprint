"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side push-navigation when a facilitator unlocks the next module or
 * activity a participant is waiting on (client feedback round 4: "taken
 * directly to that next exercise," no manual refresh or re-navigation).
 * Mirrors LiveRosterRefresher's realtime pattern, subscribed to the
 * `sessions` row instead of the roster -- every unlock signal this app has
 * (active_module_id, architecture_revealed, zone_of_investment_revealed,
 * white_whale_unlocked, leadership_wiring_unlocked) lives on that one row.
 *
 * Two usages:
 * - Inline per-activity gates (White Whale, Leadership Wiring, Zone of
 *   Investment reveal) already re-check their unlock flag fresh on every
 *   render straight from props, not cached in local state -- so a plain
 *   `router.refresh()` is enough to reveal the real content in place.
 *   Mount with `advanceHref` omitted.
 * - The dashboard's own top-level holding state needs a real navigation
 *   across routes once resolved (there's no "in place" content to reveal).
 *   Mount with `isHolding`/`advanceHref` computed from
 *   `resolveParticipantDestination` on every render; once a render shows
 *   `isHolding: false` with an `advanceHref` right after a render that had
 *   `isHolding: true`, this pushes there automatically.
 */
export function SessionGateWatcher({
  sessionId,
  isHolding = true,
  advanceHref = null,
}: {
  sessionId: string;
  isHolding?: boolean;
  advanceHref?: string | null;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasHoldingRef = useRef(isHolding);

  useEffect(() => {
    if (wasHoldingRef.current && !isHolding && advanceHref) {
      router.push(advanceHref);
    }
    wasHoldingRef.current = isHolding;
  }, [isHolding, advanceHref, router]);

  useEffect(() => {
    if (!isHolding) return;

    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), 800);
    };

    // Realtime enforces RLS on postgres_changes -- the socket connects and
    // reports "SUBSCRIBED" either way, but a subscription opened before the
    // client's Realtime auth token is set stays silently unauthorized for
    // row-level reads (connects fine, delivers nothing). createBrowserClient
    // wires this up asynchronously on init, so it isn't reliably ready by
    // the time this effect runs -- fetch the session and set it explicitly
    // before subscribing rather than racing that internal wiring.
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`session-gate-${sessionId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
          scheduleRefresh,
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [isHolding, sessionId, router]);

  return null;
}
