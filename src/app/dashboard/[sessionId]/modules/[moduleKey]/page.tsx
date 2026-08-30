import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getParticipantDashboard } from "@/lib/data/participantDashboard";
import { hasCompletedIntake } from "@/lib/data/moduleZeroStatus";
import { resolveParticipantDestination } from "@/lib/moduleState";
import { getDemoAssessment, getDemoAssessmentByKey } from "@/lib/data/moduleContent";
import { getZoneOfInvestmentData } from "@/lib/data/zoneOfInvestment";
import { getDelegationCandidates } from "@/lib/data/delegation";
import { getArchitectureData } from "@/lib/data/architecture";
import { getOperatingAltitudeData } from "@/lib/data/operatingAltitude";
import { getExecutiveLeverageDiagnosticData } from "@/lib/data/executiveLeverageDiagnostic";
import { getSuccessVisionData } from "@/lib/data/successVision";
import { Container } from "@/components/ui/Container";
import { ModuleStateBadge } from "@/components/ui/ModuleStateBadge";
import { AssessmentForm } from "@/components/participant/AssessmentForm";
import { GenericPlaceholderModule } from "@/components/participant/GenericPlaceholderModule";
import { ZoneOfInvestmentFlow } from "@/components/participant/ZoneOfInvestmentFlow";
import { DelegationFlow } from "@/components/participant/DelegationFlow";
import { ArchitectureFlow } from "@/components/participant/ArchitectureFlow";
import { OperatingAltitudeFlow } from "@/components/participant/OperatingAltitudeFlow";
import { SuccessFlow } from "@/components/participant/SuccessFlow";
import { ModuleStartTracker } from "@/components/participant/ModuleStartTracker";

const DELEGATION_BELIEFS_ASSESSMENT_KEY = "dev_demo_delegation_beliefs";

const WIDE_MODULES = new Set(["current_structure", "delegation"]);

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

  // Guided-progression model: a participant can revisit a module they've
  // already completed, but can't jump ahead to a cohort-unlocked module
  // they haven't reached yet -- a late joiner in particular may find
  // several modules cohort-unlocked at once (see resolveParticipantDestination).
  if (currentModule.state !== "COMPLETE") {
    const contextDone = await hasCompletedIntake();
    const trackedModules = dashboard.modules.filter((m) => !m.requiresLiveWorkshop);
    const destination = resolveParticipantDestination(contextDone, trackedModules);
    const isCurrentStep = destination.type === "module" && destination.moduleKey === moduleKey;
    if (!isCurrentStep) {
      redirect(`/dashboard/${sessionId}`);
    }
  }

  const sessionPath = `/dashboard/${sessionId}`;
  const alreadyComplete = currentModule.state === "COMPLETE";

  let content: React.ReactNode;

  if (moduleKey === "operating_altitude") {
    const [diagnostic, operatingAltitudeData] = await Promise.all([
      getExecutiveLeverageDiagnosticData(dashboard.participantSessionId),
      getOperatingAltitudeData(sessionId, dashboard.participantSessionId),
    ]);
    content = (
      <OperatingAltitudeFlow
        diagnosticAssessment={diagnostic.assessment}
        diagnosticResult={diagnostic.result}
        data={operatingAltitudeData}
        participantSessionId={dashboard.participantSessionId}
        moduleId={currentModule.id}
        sessionId={sessionId}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
      />
    );
  } else if (moduleKey === "success") {
    const successData = await getSuccessVisionData(dashboard.participantSessionId);
    content = (
      <SuccessFlow
        data={successData}
        participantSessionId={dashboard.participantSessionId}
        moduleId={currentModule.id}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
      />
    );
  } else if (moduleKey === "current_structure") {
    const zoneData = await getZoneOfInvestmentData(sessionId, dashboard.participantSessionId);
    content = (
      <ZoneOfInvestmentFlow
        data={zoneData}
        participantSessionId={dashboard.participantSessionId}
        moduleId={currentModule.id}
        sessionId={sessionId}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
      />
    );
  } else if (moduleKey === "delegation") {
    const [assessment, candidates] = await Promise.all([
      getDemoAssessmentByKey(DELEGATION_BELIEFS_ASSESSMENT_KEY, dashboard.participantSessionId),
      getDelegationCandidates(dashboard.participantSessionId),
    ]);
    content = (
      <DelegationFlow
        assessment={assessment}
        assessmentKey={DELEGATION_BELIEFS_ASSESSMENT_KEY}
        candidates={candidates}
        participantSessionId={dashboard.participantSessionId}
        moduleId={currentModule.id}
        sessionId={sessionId}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
      />
    );
  } else if (moduleKey === "architecture") {
    const architectureData = await getArchitectureData(sessionId, dashboard.participantSessionId);
    content = (
      <ArchitectureFlow
        data={architectureData}
        participantSessionId={dashboard.participantSessionId}
        moduleId={currentModule.id}
        sessionId={sessionId}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
      />
    );
  } else {
    const demoAssessment = await getDemoAssessment(moduleKey, dashboard.participantSessionId);
    content = demoAssessment ? (
      <AssessmentForm
        assessment={demoAssessment}
        participantSessionId={dashboard.participantSessionId}
        moduleId={currentModule.id}
        moduleKey={currentModule.key}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
        isPlaceholder
      />
    ) : (
      <GenericPlaceholderModule
        moduleName={currentModule.name}
        participantSessionId={dashboard.participantSessionId}
        moduleId={currentModule.id}
        moduleKey={currentModule.key}
        sessionPath={sessionPath}
        alreadyComplete={alreadyComplete}
      />
    );
  }

  return (
    <main className="flex-1 py-16">
      <Container narrow={!WIDE_MODULES.has(moduleKey)}>
        <ModuleStartTracker
          shouldTrack={currentModule.state === "OPEN"}
          participantSessionId={dashboard.participantSessionId}
          moduleId={currentModule.id}
          moduleKey={currentModule.key}
          sessionPath={sessionPath}
        />
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

        <div className="mt-8">{content}</div>
      </Container>
    </main>
  );
}
