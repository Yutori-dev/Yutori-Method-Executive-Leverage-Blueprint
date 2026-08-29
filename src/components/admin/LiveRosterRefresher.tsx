"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Brief section 13: "real-time facilitator visibility." Subscribes to
 * participant_sessions and participant_module_progress changes for this
 * session via Supabase Realtime and refreshes the server-rendered roster
 * when something changes, instead of requiring a manual page reload.
 *
 * Debounced -- a participant answering several questions in quick
 * succession fires several change events, and this coalesces them into one
 * refresh rather than hammering the server on every keystroke-adjacent
 * write. RLS still applies to what the underlying refetch can see; this
 * component only decides *when* to ask for fresh data, not what's in it.
 */
export function LiveRosterRefresher({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), 800);
    };

    const channel = supabase
      .channel(`admin-roster-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participant_sessions", filter: `session_id=eq.${sessionId}` },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participant_module_progress" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  return null;
}
