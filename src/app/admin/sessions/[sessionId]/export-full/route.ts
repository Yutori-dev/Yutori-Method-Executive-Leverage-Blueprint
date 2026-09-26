import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { getFullResponseRows, FULL_EXPORT_HEADERS } from "@/lib/data/fullResponseExport";

/**
 * Every answer and every other piece of data collected for every
 * participant in one session, long format. Independent of session status:
 * archiving a session hides its questions from participants, never the
 * data behind them. Authorization mirrors the summary export -- explicit
 * is_admin() check up front, RLS behind it.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { data: session } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id")
    .eq("session_id", sessionId);

  const rows = await getFullResponseRows((enrollments ?? []).map((e) => e.id));
  const csv = toCsv(
    FULL_EXPORT_HEADERS,
    rows.map((r) => [r.participant, r.email, r.session, r.module, r.question, r.answer]),
  );

  const filename = `${session.name.replace(/[^a-z0-9]+/gi, "-")}-all-responses.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
