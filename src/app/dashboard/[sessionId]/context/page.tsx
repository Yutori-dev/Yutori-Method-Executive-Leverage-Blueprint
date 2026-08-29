import { notFound } from "next/navigation";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { getDemoAssessmentByKey } from "@/lib/data/moduleContent";
import { Container } from "@/components/ui/Container";
import { ExecutiveContextFlow } from "@/components/participant/ExecutiveContextFlow";

export default async function ExecutiveContextPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const dashboard = await getParticipantDashboard(sessionId);
  if (!dashboard) notFound();

  const assessment = await getDemoAssessmentByKey("dev_demo_module_0_context", dashboard.participantSessionId);

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <p className="font-serif text-sm italic text-(--color-ink-muted)">
          Yutori Method™ Executive Leverage Blueprint
        </p>
        <h1 className="mt-2 font-serif text-2xl">A little about your context</h1>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          This helps your facilitator understand your starting point. It only takes a moment.
        </p>
        <div className="mt-8">
          <ExecutiveContextFlow
            assessment={assessment}
            sessionId={sessionId}
            participantSessionId={dashboard.participantSessionId}
          />
        </div>
      </Container>
    </main>
  );
}
