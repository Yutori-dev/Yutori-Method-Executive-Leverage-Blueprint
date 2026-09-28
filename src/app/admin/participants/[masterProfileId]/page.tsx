import { notFound } from "next/navigation";
import Link from "next/link";
import { getMasterProfileDetail } from "@/lib/data/masterProfile";
import { getParticipantFiles, getSignedFileUrl } from "@/lib/data/participantFiles";
import { listCharacterAssessments } from "@/lib/data/characterAssessments";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { MergeParticipantControl } from "@/components/admin/MergeParticipantControl";
import { PairProfileControl } from "@/components/admin/PairProfileControl";
import { RoleOverrideControl } from "@/components/admin/RoleOverrideControl";
import { ParticipantFilesControl } from "@/components/admin/ParticipantFilesControl";

const COMPLETION_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

export default async function MasterProfilePage({
  params,
}: {
  params: Promise<{ masterProfileId: string }>;
}) {
  const { masterProfileId } = await params;
  const profile = await getMasterProfileDetail(masterProfileId);
  if (!profile) notFound();

  const primary = profile.participants[0];
  const files = await getParticipantFiles(masterProfileId);
  const characterAssessments = await listCharacterAssessments({ masterProfileId });
  const fileRows = await Promise.all(
    files.map(async (f) => ({ ...f, downloadUrl: await getSignedFileUrl(f.filePath) })),
  );

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin/participants"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to participants
        </Link>

        <h1 className="mt-4 font-serif text-3xl">
          {primary.firstName} {primary.lastName}
        </h1>
        {primary.companyName || primary.currentRoleTitle ? (
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            {primary.currentRoleTitle}
            {primary.currentRoleTitle && primary.companyName ? " · " : ""}
            {primary.companyName}
          </p>
        ) : null}

        <div className="mt-4">
          <a
            href={`/admin/participants/${profile.masterProfileId}/export`}
            className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-1.5 text-xs font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
          >
            Download all answers (CSV)
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-serif text-lg">Registrations</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Every email that logs into this same profile.
            </p>
            <div className="mt-4 space-y-3">
              {profile.participants.map((p) => (
                <div key={p.id} className="rounded-lg border border-(--color-hairline) px-3 py-2">
                  <p className="text-sm text-(--color-ink)">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-(--color-ink-muted)">{p.email}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <MergeParticipantControl masterProfileId={profile.masterProfileId} />
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Visionary / Integrator</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Inferred from job title -- CEO/founder-type titles read Visionary, assistant/COO-type
              titles read Integrator. Override anytime.
            </p>
            <div className="mt-4">
              <RoleOverrideControl
                masterProfileId={profile.masterProfileId}
                inferredRole={profile.inferredRole}
                override={profile.inferredRoleOverride}
              />
            </div>

            <div className="mt-6 border-t border-(--color-hairline) pt-4">
              <h3 className="text-sm font-medium">Counterpart pairing</h3>
              <p className="mt-1 text-xs text-(--color-ink-muted)">
                For modules that need both people&apos;s input on one shared artifact.
              </p>
              <div className="mt-3">
                <PairProfileControl masterProfileId={profile.masterProfileId} paired={profile.pairedProfileSummary} />
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Information</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              What each registration told us at intake. Their answers to every assessment question are in the
              download above, or open a session below.
            </p>
            <div className="mt-4 space-y-5">
              {profile.participants.map((p) => (
                <div key={p.id}>
                  {profile.participants.length > 1 ? (
                    <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{p.email}</p>
                  ) : null}
                  <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    {[
                      ["Company", p.companyName],
                      ["Role / title", p.currentRoleTitle],
                      ["Current executive support", p.currentSupport],
                      ["Whole-business operating system", p.wholeBusinessOs],
                      ["Intake completed", p.intakeCompletedAt ? new Date(p.intakeCompletedAt).toLocaleDateString() : "Not yet"],
                      [
                        "Privacy notice accepted",
                        p.privacyConsentGivenAt
                          ? `${new Date(p.privacyConsentGivenAt).toLocaleDateString()}${p.privacyConsentVersion ? ` (${p.privacyConsentVersion})` : ""}`
                          : "Not recorded",
                      ],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <dt className="text-xs text-(--color-ink-muted)">{label}</dt>
                        <dd className="text-(--color-ink)">{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Files</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">
              Uploaded files show up in this person&apos;s portal alongside their Blueprints.
            </p>
            <div className="mt-4">
              <ParticipantFilesControl masterProfileId={profile.masterProfileId} files={fileRows} />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Character Assessment</h2>
            {characterAssessments.length === 0 ? (
              <p className="mt-2 text-sm text-(--color-ink-muted)">
                No Character Assessment on file. Import a LimeSurvey export from the{" "}
                <Link href="/admin/character-assessments" className="text-(--color-accent) hover:underline">
                  Character Assessments
                </Link>{" "}
                page.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {characterAssessments.map((a) => (
                  <Link
                    key={a.id}
                    href={`/admin/character-assessments/${a.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-(--color-hairline) px-3 py-2 text-sm hover:border-(--color-accent)"
                  >
                    <span className="text-(--color-accent)">
                      {a.sourceCompletedAt ? `Completed ${new Date(a.sourceCompletedAt).toLocaleDateString()}` : "Imported response"}
                    </span>
                    <span className="text-xs text-(--color-ink-muted)">
                      {a.hasScores ? "Scored" : "Not scored"} · {a.released ? "Released" : a.reportFileName ? "Report attached" : "No report"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Sessions</h2>
            {profile.enrollments.length === 0 ? (
              <p className="mt-2 text-sm text-(--color-ink-muted)">Not enrolled in any session yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                      <th className="pb-2 pr-4">Session</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Last active</th>
                      <th className="pb-2 pr-4">Responses</th>
                      <th className="pb-2">Blueprint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.enrollments.map((e) => (
                      <tr key={e.participantSessionId} className="border-b border-(--color-hairline)/60">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/admin/sessions/${e.sessionId}/participants/${e.participantSessionId}`}
                            className="text-(--color-accent) hover:underline"
                          >
                            {e.sessionName}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{COMPLETION_LABEL[e.completionState] ?? e.completionState}</td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">
                          {new Date(e.lastActiveAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4">
                          <Link
                            href={`/admin/sessions/${e.sessionId}/participants/${e.participantSessionId}`}
                            className="text-(--color-accent) hover:underline"
                          >
                            View
                          </Link>
                        </td>
                        <td className="py-2">
                          <Link
                            href={`/admin/sessions/${e.sessionId}/participants/${e.participantSessionId}/blueprint`}
                            className="text-(--color-accent) hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </Container>
    </main>
  );
}
