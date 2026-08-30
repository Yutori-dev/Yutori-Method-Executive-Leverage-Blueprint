import { notFound } from "next/navigation";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { getParticipantIntake } from "@/lib/data/participantIntake";
import { Container } from "@/components/ui/Container";
import { IntakeForm } from "@/components/participant/IntakeForm";
import { IntakeStartTracker } from "@/components/participant/IntakeStartTracker";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const dashboard = await getParticipantDashboard(sessionId);
  if (!dashboard) notFound();

  const initial = await getParticipantIntake();

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <IntakeStartTracker />
        <p className="font-serif text-sm italic text-(--color-ink-muted)">
          Yutori Method™ Executive Leverage Blueprint
        </p>
        <h1 className="mt-2 font-serif text-2xl">A few details before we begin</h1>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          This helps your facilitator understand your starting point. It only takes a moment, and
          you can update it later from here if anything changes.
        </p>
        <div className="mt-8">
          <IntakeForm initial={initial} sessionPath={`/dashboard/${sessionId}`} />
        </div>
      </Container>
    </main>
  );
}
