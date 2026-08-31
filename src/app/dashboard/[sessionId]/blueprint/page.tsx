import { notFound } from "next/navigation";
import Link from "next/link";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { getBlueprintData } from "@/lib/data/blueprint";
import { Container } from "@/components/ui/Container";
import { BlueprintView } from "@/components/participant/BlueprintView";

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const dashboard = await getParticipantDashboard(sessionId);
  if (!dashboard) notFound();

  const data = await getBlueprintData(sessionId, dashboard.participantSessionId);
  if (!data) notFound();

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/${sessionId}`}
            className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            ← Back to dashboard
          </Link>
          <a
            href={`/api/blueprint/${dashboard.participantSessionId}/pdf`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-(--color-accent-soft) px-5 py-2.5 text-sm font-medium tracking-wide text-(--color-ink) transition-colors hover:bg-(--color-accent-soft)/70"
          >
            Download PDF
          </a>
        </div>

        <div className="mt-8">
          <BlueprintView
            data={data}
            participantName={`${dashboard.participant.firstName} ${dashboard.participant.lastName}`}
            participantSessionId={dashboard.participantSessionId}
          />
        </div>
      </Container>
    </main>
  );
}
