import { notFound } from "next/navigation";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { Container } from "@/components/ui/Container";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ModuleRow } from "@/components/participant/ModuleRow";

export default async function ParticipantDashboardPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const dashboard = await getParticipantDashboard(sessionId);

  if (!dashboard) notFound();

  const trackedModules = dashboard.modules.filter((m) => !m.requiresLiveWorkshop);
  const completedCount = trackedModules.filter((m) => m.state === "COMPLETE").length;

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <p className="font-serif text-sm italic text-(--color-ink-muted)">
          Yutori Method™ Executive Leverage Blueprint
        </p>
        <h1 className="mt-2 font-serif text-3xl">
          {dashboard.participant.firstName} {dashboard.participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {dashboard.session.name}
          {dashboard.session.organization ? ` · ${dashboard.session.organization}` : ""}
        </p>

        <div className="mt-8 max-w-sm">
          <ProgressBar completed={completedCount} total={trackedModules.length} />
        </div>

        <div className="mt-10 space-y-3">
          {dashboard.modules.map((module, index) => (
            <ModuleRow key={module.id} module={module} sessionId={sessionId} index={index} />
          ))}
        </div>
      </Container>
    </main>
  );
}
