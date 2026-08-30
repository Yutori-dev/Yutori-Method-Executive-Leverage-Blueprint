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
                  <dl className="grid grid-cols-3 gap-3 text-sm">
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
                Primary signal:{" "}
                {profile.architecture.isTied
                  ? "Mixed (no clear majority)"
                  : (LEVEL_LABEL[profile.architecture.primarySignalLeverageLevel ?? ""] ?? "—")}
              </p>
              <p className="mt-2 text-sm text-(--color-ink-muted)">{profile.architecture.rationale}</p>
              {profile.architecture.reaction ? (
                <p className="mt-3 text-sm">
                  Reaction: <span className="capitalize">{profile.architecture.reaction.replace("_", " ")}</span>
                  {profile.architecture.reactionNote ? ` — "${profile.architecture.reactionNote}"` : ""}
                </p>
              ) : null}
            </Card>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
