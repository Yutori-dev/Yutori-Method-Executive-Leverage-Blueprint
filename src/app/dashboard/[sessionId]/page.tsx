import { notFound } from "next/navigation";
import Link from "next/link";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { hasCompletedExecutiveContext } from "@/lib/data/moduleZeroStatus";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
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
  const contextDone = await hasCompletedExecutiveContext(dashboard.participantSessionId);

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

        {!contextDone ? (
          <Card className="mt-6 border-(--color-accent)">
            <p className="text-sm text-(--color-ink)">Complete your executive context</p>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              A couple of quick questions to help your facilitator understand your starting point.
            </p>
            <Link
              href={`/dashboard/${sessionId}/context`}
              className="mt-3 inline-block text-sm text-(--color-accent) underline underline-offset-4"
            >
              Continue
            </Link>
          </Card>
        ) : null}

        <Link
          href={`/dashboard/${sessionId}/blueprint`}
          className="mt-4 inline-block text-xs text-(--color-accent) underline underline-offset-4"
        >
          View my Blueprint
        </Link>

        <div className="mt-10 space-y-3">
          {dashboard.modules.map((module, index) => (
            <ModuleRow key={module.id} module={module} sessionId={sessionId} index={index} />
          ))}
        </div>
      </Container>
    </main>
  );
}
