import { notFound } from "next/navigation";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { getWorkshopFeedbackPageData } from "@/lib/data/workshopFeedback";
import { Container } from "@/components/ui/Container";
import { WorkshopFeedbackForm } from "@/components/participant/WorkshopFeedbackForm";

export default async function WorkshopFeedbackPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const dashboard = await getParticipantDashboard(sessionId);
  if (!dashboard) notFound();

  const pageData = await getWorkshopFeedbackPageData(dashboard.participantSessionId);

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <p className="font-serif text-sm italic text-(--color-ink-muted)">
          Yutori Method™ Executive Leverage Blueprint
        </p>
        <h1 className="mt-2 font-serif text-2xl">Workshop feedback</h1>
        <div className="mt-8">
          <WorkshopFeedbackForm
            participantSessionId={dashboard.participantSessionId}
            alreadySubmitted={pageData.alreadySubmitted}
            diagnosticFollowUpUrl={pageData.diagnosticFollowUpUrl}
          />
        </div>
      </Container>
    </main>
  );
}
