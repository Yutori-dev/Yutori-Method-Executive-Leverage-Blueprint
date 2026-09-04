import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBlueprintData } from "@/lib/data/blueprint";
import { Container } from "@/components/ui/Container";
import { BlueprintView } from "@/components/participant/BlueprintView";

/**
 * Admin-facing "view this participant's actual Blueprint" (client ask,
 * 2026-09-03: "would it be difficult for us to also see everyone's full
 * blueprint on the back end"). Reuses getBlueprintData/BlueprintView
 * unchanged -- both are already RLS-scoped to "the owning participant or
 * an admin" (see blueprint.ts's own doc comment), so this route needed no
 * new data access, only a page to reach it from.
 */
export default async function AdminParticipantBlueprintPage({
  params,
}: {
  params: Promise<{ sessionId: string; participantSessionId: string }>;
}) {
  const { sessionId, participantSessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: participantSession } = await supabase
    .from("participant_sessions")
    .select("participants(first_name, last_name)")
    .eq("id", participantSessionId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!participantSession) notFound();

  const participant = participantSession.participants as unknown as {
    first_name: string;
    last_name: string;
  } | null;
  if (!participant) notFound();

  const data = await getBlueprintData(sessionId, participantSessionId);
  if (!data) notFound();

  return (
    <main className="flex-1 py-16">
      <Container wide>
        <div className="flex items-center justify-between">
          <Link
            href={`/admin/sessions/${sessionId}/participants/${participantSessionId}`}
            className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            ← Back to participant
          </Link>
          <a
            href={`/api/blueprint/${participantSessionId}/pdf`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-(--color-accent-soft) px-5 py-2.5 text-sm font-medium tracking-wide text-(--color-ink) transition-colors hover:bg-(--color-accent-soft)/70"
          >
            Download PDF
          </a>
        </div>

        <div className="mt-8">
          <BlueprintView
            data={data}
            participantName={`${participant.first_name} ${participant.last_name}`}
            participantSessionId={participantSessionId}
          />
        </div>
      </Container>
    </main>
  );
}
