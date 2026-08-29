import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { getDemoAssessment } from "@/lib/data/moduleContent";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { ModuleStateBadge } from "@/components/ui/ModuleStateBadge";
import { AssessmentForm } from "@/components/participant/AssessmentForm";
import { GenericPlaceholderModule } from "@/components/participant/GenericPlaceholderModule";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ sessionId: string; moduleKey: string }>;
}) {
  const { sessionId, moduleKey } = await params;
  const dashboard = await getParticipantDashboard(sessionId);
  if (!dashboard) notFound();

  const currentModule = dashboard.modules.find((m) => m.key === moduleKey);
  if (!currentModule) notFound();

  // Server-side enforcement -- a hidden/removed link is not access control.
  if (currentModule.state === "LOCKED") {
    redirect(`/dashboard/${sessionId}`);
  }

  if (currentModule.state === "OPEN") {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("participant_module_progress")
      .upsert(
        {
          participant_session_id: dashboard.participantSessionId,
          module_id: currentModule.id,
          status: "in_progress",
          started_at: new Date().toISOString(),
        },
        { onConflict: "participant_session_id,module_id" },
      );
    await supabase
      .from("participant_sessions")
      .update({ current_module_id: currentModule.id, last_active_at: new Date().toISOString() })
      .eq("id", dashboard.participantSessionId);
  }

  const demoAssessment = await getDemoAssessment(moduleKey, dashboard.participantSessionId);
  const sessionPath = `/dashboard/${sessionId}`;

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <Link
          href={sessionPath}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to Blueprint
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <h1 className="font-serif text-3xl">{currentModule.name}</h1>
          <ModuleStateBadge state={currentModule.state} />
        </div>

        <div className="mt-8">
          {demoAssessment ? (
            <AssessmentForm
              assessment={demoAssessment}
              participantSessionId={dashboard.participantSessionId}
              moduleId={currentModule.id}
              moduleKey={currentModule.key}
              sessionPath={sessionPath}
              alreadyComplete={currentModule.state === "COMPLETE"}
            />
          ) : (
            <GenericPlaceholderModule
              moduleName={currentModule.name}
              participantSessionId={dashboard.participantSessionId}
              moduleId={currentModule.id}
              moduleKey={currentModule.key}
              sessionPath={sessionPath}
              alreadyComplete={currentModule.state === "COMPLETE"}
            />
          )}
        </div>
      </Container>
    </main>
  );
}
