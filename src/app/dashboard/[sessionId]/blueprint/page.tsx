import { notFound } from "next/navigation";
import Link from "next/link";
import { getArtifactAccess } from "@/lib/data/participantArtifacts";
import { getBlueprintData } from "@/lib/data/blueprint";
import { Container } from "@/components/ui/Container";
import { BlueprintView } from "@/components/participant/BlueprintView";

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Resolved through the caller's master profile, not just their own
  // participant_id -- a person who attended a past session under a
  // different email an admin has since merged into their profile should
  // still be able to open that Blueprint. This page stays reachable for
  // archived sessions on purpose: archiving hides the questions, never
  // the finished artifact.
  const access = await getArtifactAccess(sessionId);
  if (!access) notFound();

  const data = await getBlueprintData(sessionId, access.participantSessionId);
  if (!data) notFound();

  const isArchived = access.sessionStatus === "archived";

  return (
    <main className="flex-1 py-16">
      <Container wide>
        <div className="flex items-center justify-between">
          <Link
            href={isArchived ? "/dashboard" : `/dashboard/${sessionId}`}
            className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            ← Back to dashboard
          </Link>
          <a
            href={`/api/blueprint/${access.participantSessionId}/pdf`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-(--color-accent-soft) px-5 py-2.5 text-sm font-medium tracking-wide text-(--color-ink) transition-colors hover:bg-(--color-accent-soft)/70"
          >
            Download PDF
          </a>
        </div>

        <div className="mt-8">
          <BlueprintView
            data={data}
            participantName={access.participantName}
            participantSessionId={access.participantSessionId}
          />
        </div>
      </Container>
    </main>
  );
}
