import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getArtifactDocs } from "@/lib/data/artifactDocsData";
import { ArtifactDocPdf } from "@/components/pdf/ArtifactDocPdf";

/** PDF of one new-module artifact, built from the same ArtifactDoc the
 * portal shows. RLS limits the underlying read to the owner, a merged
 * sibling registration, or an admin -- anyone else gets no rows -> 404. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ participantSessionId: string; assessmentKey: string }> },
) {
  const { participantSessionId, assessmentKey } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: enrollment } = await supabase
    .from("participant_sessions")
    .select("session_id, participants(first_name, last_name), sessions(name)")
    .eq("id", participantSessionId)
    .maybeSingle();
  if (!enrollment) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const doc = (await getArtifactDocs(participantSessionId)).find((d) => d.key === assessmentKey);
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const person = enrollment.participants as unknown as { first_name: string; last_name: string } | null;
  const session = enrollment.sessions as unknown as { name: string } | null;
  const participantName = person ? `${person.first_name} ${person.last_name}` : "Participant";

  const buffer = await renderToBuffer(
    ArtifactDocPdf({ doc, participantName, sessionName: session?.name ?? "" }) as Parameters<typeof renderToBuffer>[0],
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${participantName.replace(/[^a-z0-9]+/gi, "-")}-${assessmentKey.replace(/_/g, "-")}.pdf"`,
    },
  });
}
