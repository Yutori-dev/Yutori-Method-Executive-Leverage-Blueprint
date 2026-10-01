import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtifactDocs } from "@/lib/data/artifactDocsData";
import { getAdminParticipantProfile } from "@/lib/data/adminParticipantProfile";
import { Container } from "@/components/ui/Container";
import { ArtifactDocView } from "@/components/participant/ArtifactDocView";

/** Admin view of each new-module artifact exactly as the participant sees
 * it (same ArtifactDoc), with a separate PDF download per artifact. */
export default async function AdminArtifactsPage({
  params,
}: {
  params: Promise<{ sessionId: string; participantSessionId: string }>;
}) {
  const { sessionId, participantSessionId } = await params;
  const profile = await getAdminParticipantProfile(participantSessionId);
  if (!profile) notFound();
  const docs = await getArtifactDocs(participantSessionId);

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}/participants/${participantSessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to participant
        </Link>
        <h1 className="mt-4 font-serif text-3xl">
          {profile.participant.firstName} {profile.participant.lastName} — workshop artifacts
        </h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">Shown exactly as the participant sees them. Completed artifacts only.</p>
        <div className="mt-8 space-y-6">
          {docs.length === 0 ? <p className="text-sm text-(--color-ink-muted)">No completed artifacts yet.</p> : null}
          {docs.map((doc) => (
            <div key={doc.key}>
              <ArtifactDocView doc={doc} />
              <a
                href={`/api/artifacts/${participantSessionId}/${doc.key}/pdf`}
                className="mt-2 inline-flex items-center rounded-full bg-(--color-accent-soft) px-4 py-1.5 text-xs font-medium text-(--color-ink)"
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
