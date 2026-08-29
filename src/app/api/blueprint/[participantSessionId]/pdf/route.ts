import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBlueprintData } from "@/lib/data/blueprint";
import { BlueprintPdfDocument } from "@/components/pdf/BlueprintPdfDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantSessionId: string }> },
) {
  const { participantSessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // RLS already restricts this select to the owning participant or an
  // admin -- an unauthorized caller simply gets no row back.
  const { data: participantSession } = await supabase
    .from("participant_sessions")
    .select("session_id, participant_id")
    .eq("id", participantSessionId)
    .maybeSingle();

  if (!participantSession) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("first_name, last_name")
    .eq("id", participantSession.participant_id)
    .maybeSingle();

  const data = await getBlueprintData(participantSession.session_id, participantSessionId);
  if (!data || !participant) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const participantName = `${participant.first_name} ${participant.last_name}`;
  const buffer = await renderToBuffer(
    BlueprintPdfDocument({ data, participantName }) as Parameters<typeof renderToBuffer>[0],
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${participantName.replace(/[^a-z0-9]+/gi, "-")}-blueprint.pdf"`,
    },
  });
}
