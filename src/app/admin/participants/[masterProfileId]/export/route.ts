import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { getFullResponseRows, FULL_EXPORT_HEADERS } from "@/lib/data/fullResponseExport";

/**
 * One person's complete history across every session and every linked
 * registration (any email merged into this master profile) in a single
 * long-format CSV -- the "download their full answers" ask on the master
 * participant profile.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ masterProfileId: string }> }) {
  const { masterProfileId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { data: participants } = await supabase
    .from("participants")
    .select("id, first_name, last_name")
    .eq("master_profile_id", masterProfileId);
  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id")
    .in("participant_id", participants.map((p) => p.id))
    .order("created_at", { ascending: true });

  const rows = await getFullResponseRows((enrollments ?? []).map((e) => e.id));
  const csv = toCsv(
    FULL_EXPORT_HEADERS,
    rows.map((r) => [r.participant, r.email, r.session, r.module, r.question, r.answer, r.recordedAt]),
  );

  const first = participants[0];
  const filename = `${`${first.first_name}-${first.last_name}`.replace(/[^a-z0-9]+/gi, "-")}-all-responses.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
