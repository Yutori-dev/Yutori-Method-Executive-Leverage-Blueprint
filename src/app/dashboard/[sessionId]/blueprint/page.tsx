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
            className="text-xs text-(--color-accent) underline underline-offset-4"
          >
            Download PDF
          </a>
        </div>

        <div className="mt-8">
          <BlueprintView
            data={data}
            participantName={`${dashboard.participant.firstName} ${dashboard.participant.lastName}`}
          />
        </div>
      </Container>
    </main>
  );
}
