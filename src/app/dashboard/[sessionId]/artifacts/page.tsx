import { notFound } from "next/navigation";
import Link from "next/link";
import { getArtifactAccess } from "@/lib/data/participantArtifacts";
import { getArtifactDocs } from "@/lib/data/artifactDocsData";
import { Container } from "@/components/ui/Container";
import { ArtifactDocView } from "@/components/participant/ArtifactDocView";

/** Finished artifacts of the new modules (Thinking Traps result, Audit
 * snapshot, Start-Stop-Shift commitments, High-Leverage Handoff). Stays
 * reachable after a session is archived -- archiving hides the questions,
 * never the finished artifacts -- and resolves through the caller's master
 * profile like the Blueprint does. Read-only: editing lives in the module
 * pages, which an archived session no longer exposes. */
export default async function ArtifactsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const access = await getArtifactAccess(sessionId);
  if (!access) notFound();

  const docs = await getArtifactDocs(access.participantSessionId);
  const isArchived = access.sessionStatus === "archived";

  return (
    <main className="flex-1 py-16">
      <Container narrow>
        <div className="flex items-center justify-between">
          <Link
            href={isArchived ? "/dashboard" : `/dashboard/${sessionId}`}
            className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            ← Back to dashboard
          </Link>
        </div>
        <h1 className="mt-4 font-serif text-3xl">Your workshop artifacts</h1>
        <div className="mt-8 space-y-6">
          {docs.length === 0 ? <p className="text-sm text-(--color-ink-muted)">Nothing to show yet.</p> : null}
          {docs.map((doc) => (
            <div key={doc.key}>
              <ArtifactDocView doc={doc} />
              <a
                href={`/api/artifacts/${access.participantSessionId}/${doc.key}/pdf`}
                className="mt-2 inline-block text-xs text-(--color-accent) underline underline-offset-4"
              >
                Download PDF
              </a>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
