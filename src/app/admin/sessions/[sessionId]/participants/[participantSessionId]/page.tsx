import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminParticipantProfile } from "@/lib/data/adminParticipantProfile";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { IntakeCard } from "@/components/admin/IntakeCard";

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

export default async function AdminParticipantProfilePage({
  params,
}: {
  params: Promise<{ sessionId: string; participantSessionId: string }>;
}) {
  const { sessionId, participantSessionId } = await params;
  const profile = await getAdminParticipantProfile(participantSessionId);
  if (!profile) notFound();

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to session
        </Link>

        <div className="mt-4">
          <h1 className="font-serif text-3xl">
            {profile.participant.firstName} {profile.participant.lastName}
          </h1>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            {profile.participant.email} · {profile.enrollment.completionState.replace("_", " ")} ·
            last active {new Date(profile.enrollment.lastActiveAt).toLocaleString()}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IntakeCard
            participantId={profile.participantId}
            firstName={profile.participant.firstName}
            lastName={profile.participant.lastName}
            companyName={profile.participant.companyName}
            currentRoleTitle={profile.participant.currentRoleTitle}
            currentSupport={profile.participant.currentSupport}
            adminPath={`/admin/sessions/${sessionId}/participants/${participantSessionId}`}
          />

          <Card>
            <h2 className="font-serif text-lg">Module progress</h2>
            <ul className="mt-3 space-y-1.5">
              {profile.modules.map((m) => (
                <li key={m.key} className="flex items-center justify-between text-sm">
                  <span>{m.name}</span>
                  <span className="text-(--color-ink-muted) capitalize">{m.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          </Card>

          {profile.operatingAltitude.length > 0 ? (
            <Card>
              <h2 className="font-serif text-lg">Operating Altitude</h2>
              <dl className="mt-3 space-y-3">
                {profile.operatingAltitude.map((a) => (
                  <div key={a.prompt}>
                    <dt className="text-xs text-(--color-ink-muted)">{a.prompt}</dt>
                    <dd className="mt-0.5 text-sm">{a.answer}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          {profile.zoneOfInvestment.length > 0 ? (
            <Card className="lg:col-span-2">
              <h2 className="font-serif text-lg">Zone of Investment</h2>
              <p className="mt-1 text-xs text-(--color-ink-muted)">
                Leverage classification is hidden from the participant during this exercise; shown
                here for coaching purposes.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                      <th className="pb-2 pr-4">Responsibility</th>
                      <th className="pb-2 pr-4">Competency</th>
                      <th className="pb-2 pr-4">Passion</th>
                      <th className="pb-2 pr-4">Macro zone</th>
                      <th className="pb-2">Leverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.zoneOfInvestment.map((r) => (
                      <tr key={r.label} className="border-b border-(--color-hairline)/60">
                        <td className="py-2 pr-4">{r.label}</td>
                        <td className="py-2 pr-4 capitalize">{r.competency ?? "—"}</td>
                        <td className="py-2 pr-4 capitalize">{r.passion ?? "—"}</td>
                        <td className="py-2 pr-4 capitalize">{r.macroZone ?? "—"}</td>
                        <td className="py-2">{LEVEL_LABEL[r.leverageLevel ?? ""] ?? "Not yet classified"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {profile.delegation.beliefs || profile.delegation.priorities.length > 0 ? (
            <Card>
              <h2 className="font-serif text-lg">Delegation</h2>
              {profile.delegation.beliefs ? (
                <div className="mt-2 space-y-3">
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-(--color-ink-muted)">Trust & Control</dt>
                      <dd className="mt-0.5">{profile.delegation.beliefs.trustControlAvg.toFixed(1)} / 5</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-(--color-ink-muted)">Team & Outcomes</dt>
                      <dd className="mt-0.5">{profile.delegation.beliefs.teamOutcomesAvg.toFixed(1)} / 5</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-(--color-ink-muted)">Workload & Resources</dt>
                      <dd className="mt-0.5">{profile.delegation.beliefs.workloadResourcesAvg.toFixed(1)} / 5</dd>
                    </div>
                  </dl>
                  {profile.delegation.beliefs.primaryBarriers.length > 0 ? (
                    <p className="text-sm text-(--color-ink-muted)">
                      Strongest barrier: {profile.delegation.beliefs.primaryBarriers.map((b) => b.domainLabel).join(", ")}
                    </p>
                  ) : (
                    <p className="text-sm text-(--color-ink-muted)">No primary barrier surfaced.</p>
                  )}
                  {profile.delegation.beliefs.flaggedOpportunities.length > 0 ? (
                    <div>
                      <p className="text-xs text-(--color-ink-muted)">Ownership transfer opportunities:</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {profile.delegation.beliefs.flaggedOpportunities.map((o) => (
                          <li key={o.id}>{o.label}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {profile.delegation.priorities.length > 0 ? (
                <>
                  <ol className="mt-3 space-y-1.5">
                    {profile.delegation.priorities.map((p) => (
                      <li key={p.selectionOrder} className="flex items-center justify-between text-sm">
                        <span>
                          {p.selectionOrder}. {p.label}
                        </span>
                        <span className="text-(--color-ink-muted)">
                          {LEVEL_LABEL[p.leverageLevelSnapshot ?? ""] ?? "Not yet classified"}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs text-(--color-ink-muted)">
                    Leverage pattern:{" "}
                    {(() => {
                      const counts = new Map<string, number>();
                      for (const p of profile.delegation.priorities) {
                        if (!p.leverageLevelSnapshot) continue;
                        counts.set(p.leverageLevelSnapshot, (counts.get(p.leverageLevelSnapshot) ?? 0) + 1);
                      }
                      return counts.size > 0
                        ? [...counts.entries()].map(([level, count]) => `${count} ${LEVEL_LABEL[level]}`).join(" · ")
                        : "Not yet classified";
                    })()}
                  </p>
                </>
              ) : null}
            </Card>
          ) : null}

          {profile.architecture ? (
            <Card>
              <h2 className="font-serif text-lg">Architecture</h2>
              <p className="mt-2 text-sm text-(--color-ink-muted)">
                {profile.architecture.revealed ? "Revealed to participant" : "Calculated, not yet revealed"}
              </p>
              {profile.architecture.needsRecalculation ? (
                <p className="mt-2 text-sm text-(--color-accent)">
                  Intake data was edited after this recommendation was calculated — may be stale.
                </p>
              ) : null}
              <p className="mt-2 text-sm">
                Signal type: <span className="capitalize">{profile.architecture.signalType.replace("_", " ")}</span>
              </p>
              {profile.architecture.primaryLeverageNeed ? (
                <p className="mt-1 text-sm">
                  Primary Leverage Need: {LEVEL_LABEL[profile.architecture.primaryLeverageNeed]}
                </p>
              ) : null}
              {profile.architecture.leadingLeverageNeed ? (
                <p className="mt-1 text-sm">
                  Leading Leverage Need: {LEVEL_LABEL[profile.architecture.leadingLeverageNeed]}
                </p>
              ) : null}
              {profile.architecture.multiLayerLevels.length > 0 ? (
                <p className="mt-1 text-sm">
                  Multi-layer levels: {profile.architecture.multiLayerLevels.map((l) => LEVEL_LABEL[l]).join(", ")}
                </p>
              ) : null}
              {profile.architecture.auditCorroboration ? (
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  Audit corroboration: <span className="capitalize">{profile.architecture.auditCorroboration}</span>
                </p>
              ) : null}
              {profile.architecture.secondaryLeverageNeeds.length > 0 ? (
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  Secondary needs: {profile.architecture.secondaryLeverageNeeds.map((l) => LEVEL_LABEL[l]).join(", ")}
                </p>
              ) : null}
              {profile.architecture.currentSupportMatchState.length > 0 ? (
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  Current support classified as:{" "}
                  {profile.architecture.currentSupportMatchState.map((l) => LEVEL_LABEL[l]).join(", ")}
                </p>
              ) : null}
              {profile.architecture.primaryRecommendedAction ? (
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  Recommended action:{" "}
                  <span className="capitalize">{profile.architecture.primaryRecommendedAction.replace(/_/g, " ")}</span>
                </p>
              ) : null}
              {profile.architecture.reaction ? (
                <p className="mt-3 text-sm">
                  Reaction: <span className="capitalize">{profile.architecture.reaction.replace("_", " ")}</span>
                  {profile.architecture.reactionNote ? ` — "${profile.architecture.reactionNote}"` : ""}
                </p>
              ) : null}
            </Card>
          ) : null}

          {profile.executiveSupportAudit ? (
            <Card>
              <h2 className="font-serif text-lg">Executive Support Audit</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-(--color-ink-muted)">Execution</dt>
                  <dd className="mt-0.5">{profile.executiveSupportAudit.scores.execution}</dd>
                </div>
                <div>
                  <dt className="text-xs text-(--color-ink-muted)">Orchestration</dt>
                  <dd className="mt-0.5">{profile.executiveSupportAudit.scores.orchestration}</dd>
                </div>
                <div>
                  <dt className="text-xs text-(--color-ink-muted)">Strategic</dt>
                  <dd className="mt-0.5">{profile.executiveSupportAudit.scores.strategic}</dd>
                </div>
                <div>
                  <dt className="text-xs text-(--color-ink-muted)">Systems</dt>
                  <dd className="mt-0.5">{profile.executiveSupportAudit.scores.systems}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-(--color-ink-muted)">
                Primary: {profile.executiveSupportAudit.primaryLayers.map((l) => LEVEL_LABEL[l]).join(", ")}
              </p>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                Secondary:{" "}
                {profile.executiveSupportAudit.secondaryLayers.length > 0
                  ? profile.executiveSupportAudit.secondaryLayers.map((l) => LEVEL_LABEL[l]).join(", ")
                  : "None"}
              </p>
            </Card>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
