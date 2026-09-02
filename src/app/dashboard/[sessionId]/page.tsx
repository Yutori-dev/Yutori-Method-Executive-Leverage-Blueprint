import { notFound } from "next/navigation";
import Link from "next/link";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { resolveParticipantDestination } from "@/lib/moduleState";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ModuleRow } from "@/components/participant/ModuleRow";
import { HoldingState } from "@/components/participant/HoldingState";
import { SessionGateWatcher } from "@/components/participant/SessionGateWatcher";

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
  const destination = resolveParticipantDestination(dashboard.intakeCompleted, trackedModules, {
    released: dashboard.session.workshopFeedbackReleased,
    submitted: dashboard.feedbackSubmitted,
  });

  const currentModuleKey = destination.type === "module" ? destination.moduleKey : null;
  const isWaiting = destination.type === "holding" || destination.type === "all-done";
  const advanceHref =
    destination.type === "module"
      ? `/dashboard/${sessionId}/modules/${destination.moduleKey}`
      : destination.type === "final-feedback"
        ? `/dashboard/${sessionId}/feedback`
        : null;

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <SessionGateWatcher sessionId={sessionId} isHolding={isWaiting} advanceHref={advanceHref} />
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

        {destination.type === "holding" ? (
          <HoldingState className="mt-6" />
        ) : (
          <Card className="mt-6 border-(--color-accent)">
            {destination.type === "context" ? (
              <>
                <p className="text-sm text-(--color-ink)">A few details before we begin</p>
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  A couple of quick questions to help your facilitator understand your starting
                  point.
                </p>
                <Link href={`/dashboard/${sessionId}/intake`} className="mt-3 inline-block">
                  <Button>CONTINUE</Button>
                </Link>
              </>
            ) : destination.type === "module" ? (
              <>
                <p className="text-sm text-(--color-ink)">
                  {trackedModules.find((m) => m.key === destination.moduleKey)?.name}
                </p>
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  {trackedModules.find((m) => m.key === destination.moduleKey)?.state === "IN_PROGRESS"
                    ? "Pick up where you left off."
                    : "Get started!"}
                </p>
                <Link
                  href={`/dashboard/${sessionId}/modules/${destination.moduleKey}`}
                  className="mt-3 inline-block"
                >
                  <Button>CONTINUE</Button>
                </Link>
              </>
            ) : destination.type === "final-feedback" ? (
              <>
                <p className="text-sm text-(--color-ink)">One last thing</p>
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  A couple of quick questions about your workshop experience.
                </p>
                <Link href={`/dashboard/${sessionId}/feedback`} className="mt-3 inline-block">
                  <Button>CONTINUE</Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-(--color-ink)">You&apos;ve completed every module.</p>
                {dashboard.session.blueprintRevealed ? (
                  <Link
                    href={`/dashboard/${sessionId}/blueprint`}
                    className="mt-3 inline-block text-sm text-(--color-accent) underline underline-offset-4"
                  >
                    View my Blueprint
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-(--color-ink-muted)">
                    Your Blueprint is being finalized.
                  </p>
                )}
              </>
            )}
          </Card>
        )}

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
