import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSessions } from "@/lib/data/participantArtifacts";
import { enrollmentsWithArtifacts } from "@/lib/data/artifactDocsData";
import { getMyFiles, getSignedFileUrl } from "@/lib/data/participantFiles";
import { getMyCharacterReports } from "@/lib/data/characterAssessments";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

export default async function DashboardIndexPage() {
  const portalSessions = await getPortalSessions();
  if (!portalSessions) redirect("/");

  const files = await getMyFiles();
  const fileLinks = await Promise.all(
    files.map(async (f) => ({ ...f, downloadUrl: await getSignedFileUrl(f.filePath) })),
  );

  const characterReports = await getMyCharacterReports();
  const reportLinks = (
    await Promise.all(characterReports.map(async (r) => ({ ...r, downloadUrl: await getSignedFileUrl(r.filePath) })))
  ).filter((r) => r.downloadUrl);

  // Archived sessions hide their Q&A entirely -- only the finished
  // Blueprint stays reachable, and only once it was actually revealed.
  // Active sessions are limited to enrollments under the caller's own
  // login: live interaction is self-scoped (writes are), so surfacing a
  // merged sibling's active session here would link to a page the caller
  // can read but not actually participate in.
  const activeSessions = portalSessions.filter((s) => s.status !== "archived" && s.ownedByCaller);
  // Past sessions keep every finished artifact: the Blueprint (once revealed)
  // and the new modules' artifacts (Thinking Traps, Audit, Start-Stop-Shift,
  // Handoff). Which enrollments have the latter is one batched lookup.
  const withArtifacts = await enrollmentsWithArtifacts(
    portalSessions.filter((s) => s.status === "archived").map((s) => s.participantSessionId),
  );
  const pastArtifacts = portalSessions.filter(
    (s) => s.status === "archived" && (s.blueprintRevealed || withArtifacts.has(s.participantSessionId)),
  );

  if (activeSessions.length === 0 && pastArtifacts.length === 0 && fileLinks.length === 0 && reportLinks.length === 0) {
    return (
      <main className="flex flex-1 items-center">
        <Container narrow className="py-20 text-center">
          <p className="text-(--color-ink-muted)">
            You&apos;re signed in, but not yet registered for a workshop session. Use the
            session link your facilitator shared with you.
          </p>
        </Container>
      </main>
    );
  }

  // Preserve the common case exactly as before: one active session and
  // nothing archived to show goes straight through, no extra click.
  if (activeSessions.length === 1 && pastArtifacts.length === 0 && fileLinks.length === 0 && reportLinks.length === 0) {
    redirect(`/dashboard/${activeSessions[0].sessionId}`);
  }

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        {activeSessions.length > 0 ? (
          <>
            <h1 className="font-serif text-2xl">Your sessions</h1>
            <div className="mt-6 space-y-3">
              {activeSessions.map((session) => (
                <Link key={session.participantSessionId} href={`/dashboard/${session.sessionId}`}>
                  <Card className="transition-colors hover:border-(--color-accent)">
                    <p className="font-medium">{session.name}</p>
                    {session.organization ? (
                      <p className="text-sm text-(--color-ink-muted)">{session.organization}</p>
                    ) : null}
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : null}

        {pastArtifacts.length > 0 ? (
          <div className={activeSessions.length > 0 ? "mt-10" : ""}>
            <h2 className="font-serif text-2xl">Your past sessions</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              From past sessions you&apos;ve completed.
            </p>
            <div className="mt-6 space-y-3">
              {pastArtifacts.map((session) => (
                <Card key={session.participantSessionId}>
                  <p className="font-medium">{session.name}</p>
                  {session.organization ? (
                    <p className="text-sm text-(--color-ink-muted)">{session.organization}</p>
                  ) : null}
                  <div className="mt-2 flex gap-4 text-xs text-(--color-accent)">
                    {session.blueprintRevealed ? (
                      <Link href={`/dashboard/${session.sessionId}/blueprint`} className="underline underline-offset-4">
                        View Blueprint
                      </Link>
                    ) : null}
                    {withArtifacts.has(session.participantSessionId) ? (
                      <Link href={`/dashboard/${session.sessionId}/artifacts`} className="underline underline-offset-4">
                        View workshop artifacts
                      </Link>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {reportLinks.length > 0 ? (
          <div className={activeSessions.length > 0 || pastArtifacts.length > 0 ? "mt-10" : ""}>
            <h2 className="font-serif text-2xl">Your Character Assessment</h2>
            <div className="mt-6 space-y-3">
              {reportLinks.map((r) => (
                <a key={r.id} href={r.downloadUrl ?? undefined}>
                  <Card className="transition-colors hover:border-(--color-accent)">
                    <p className="font-medium">Character Assessment report</p>
                    {r.completedAt ? (
                      <p className="text-sm text-(--color-ink-muted)">
                        Completed {new Date(r.completedAt).toLocaleDateString()}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-(--color-accent)">View report</p>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {fileLinks.length > 0 ? (
          <div className={activeSessions.length > 0 || pastArtifacts.length > 0 ? "mt-10" : ""}>
            <h2 className="font-serif text-2xl">Your files</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">Shared with you by your facilitator.</p>
            <div className="mt-6 space-y-3">
              {fileLinks.map((f) =>
                f.downloadUrl ? (
                  <a key={f.id} href={f.downloadUrl}>
                    <Card className="transition-colors hover:border-(--color-accent)">
                      <p className="font-medium">{f.label || f.fileName}</p>
                      <p className="text-sm text-(--color-ink-muted)">
                        {new Date(f.uploadedAt).toLocaleDateString()}
                      </p>
                    </Card>
                  </a>
                ) : null,
              )}
            </div>
          </div>
        ) : null}
      </Container>
    </main>
  );
}
