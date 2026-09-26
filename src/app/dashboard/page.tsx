import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSessions } from "@/lib/data/participantArtifacts";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

export default async function DashboardIndexPage() {
  const portalSessions = await getPortalSessions();
  if (!portalSessions) redirect("/");

  // Archived sessions hide their Q&A entirely -- only the finished
  // Blueprint stays reachable, and only once it was actually revealed.
  // Active sessions are limited to enrollments under the caller's own
  // login: live interaction is self-scoped (writes are), so surfacing a
  // merged sibling's active session here would link to a page the caller
  // can read but not actually participate in.
  const activeSessions = portalSessions.filter((s) => s.status !== "archived" && s.ownedByCaller);
  const pastArtifacts = portalSessions.filter((s) => s.status === "archived" && s.blueprintRevealed);

  if (activeSessions.length === 0 && pastArtifacts.length === 0) {
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
  if (activeSessions.length === 1 && pastArtifacts.length === 0) {
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
            <h2 className="font-serif text-2xl">Your Blueprints</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              From past sessions you&apos;ve completed.
            </p>
            <div className="mt-6 space-y-3">
              {pastArtifacts.map((session) => (
                <Link key={session.participantSessionId} href={`/dashboard/${session.sessionId}/blueprint`}>
                  <Card className="transition-colors hover:border-(--color-accent)">
                    <p className="font-medium">{session.name}</p>
                    {session.organization ? (
                      <p className="text-sm text-(--color-ink-muted)">{session.organization}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-(--color-accent)">View Blueprint</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </Container>
    </main>
  );
}
