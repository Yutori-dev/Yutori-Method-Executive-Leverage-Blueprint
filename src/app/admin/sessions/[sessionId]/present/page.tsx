import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionAggregates } from "@/lib/data/sessionAggregates";
import { PresentationView } from "@/components/admin/PresentationView";
import { LiveRosterRefresher } from "@/components/admin/LiveRosterRefresher";

/** Brief section 19: Presentation Mode -- a facilitator-selectable, fully
 * anonymized view for projecting live during the in-person workshop.
 * Reuses the same aggregate counts as the aggregate-results screen; never
 * surfaces a participant's name, email, or free-text reflections (White
 * Whale / Success Vision stay admin-only, per the note in
 * supabase/migrations/20260901000001_gap_fill_schema.sql). */
export default async function PresentationModePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  if (!session) notFound();

  const aggregates = await getSessionAggregates([sessionId]);

  return (
    <div>
      <LiveRosterRefresher sessionId={sessionId} />
      <div className="flex items-center justify-between border-b border-white/10 bg-neutral-950 px-6 py-3">
        <p className="text-sm text-white/60">{session.name} — Presentation mode</p>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-white/60 underline underline-offset-4 hover:text-white"
        >
          Exit
        </Link>
      </div>
      <PresentationView aggregates={aggregates} />
    </div>
  );
}
