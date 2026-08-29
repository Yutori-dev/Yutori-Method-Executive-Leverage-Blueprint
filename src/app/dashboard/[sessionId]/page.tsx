import { notFound } from "next/navigation";
import Link from "next/link";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { hasCompletedExecutiveContext } from "@/lib/data/moduleZeroStatus";
import { resolveParticipantDestination } from "@/lib/moduleState";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  const destination = resolveParticipantDestination(contextDone, trackedModules);

  const currentModuleKey = destination.type === "module" ? destination.moduleKey : null;

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

        <Card className="mt-6 border-(--color-accent)">
          {destination.type === "context" ? (
            <>
              <p className="text-sm text-(--color-ink)">Complete your executive context</p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                A couple of quick questions to help your facilitator understand your starting
                point.
              </p>
              <Link href={`/dashboard/${sessionId}/context`} className="mt-3 inline-block">
                <Button>CONTINUE</Button>
              </Link>
            </>
          ) : destination.type === "module" ? (
            <>
              <p className="text-sm text-(--color-ink)">
                {trackedModules.find((m) => m.key === destination.moduleKey)?.name}
              </p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                Pick up where you left off.
              </p>
              <Link
                href={`/dashboard/${sessionId}/modules/${destination.moduleKey}`}
                className="mt-3 inline-block"
              >
                <Button>CONTINUE</Button>
              </Link>
            </>
          ) : destination.type === "holding" ? (
            <>
              <p className="font-serif text-lg text-(--color-ink)">
                You&apos;re all set for now. We&apos;ll continue together shortly.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-(--color-ink)">You&apos;ve completed every module.</p>
              <Link
                href={`/dashboard/${sessionId}/blueprint`}
                className="mt-3 inline-block text-sm text-(--color-accent) underline underline-offset-4"
              >
                View my Blueprint
              </Link>
            </>
          )}
        </Card>

        {destination.type !== "all-done" ? (
          <Link
            href={`/dashboard/${sessionId}/blueprint`}
            className="mt-4 inline-block text-xs text-(--color-accent) underline underline-offset-4"
          >
            View my Blueprint
          </Link>
        ) : null}

        <div className="mt-10 space-y-3">
          {dashboard.modules.map((module, index) => (
            <ModuleRow
              key={module.id}
              module={module}
              sessionId={sessionId}
              index={index}
              isReachable={module.state === "COMPLETE" || module.key === currentModuleKey}
            />
          ))}
        </div>
      </Container>
    </main>
  );
}
