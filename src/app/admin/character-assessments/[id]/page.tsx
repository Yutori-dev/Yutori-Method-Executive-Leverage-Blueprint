import { notFound } from "next/navigation";
import Link from "next/link";
import { getCharacterAssessment } from "@/lib/data/characterAssessments";
import { getSignedFileUrl } from "@/lib/data/participantFiles";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CharacterAssessmentControls } from "@/components/admin/CharacterAssessmentControls";

export default async function CharacterAssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = await getCharacterAssessment(id);
  if (!assessment) notFound();

  const reportDownloadUrl = assessment.reportFilePath ? await getSignedFileUrl(assessment.reportFilePath) : null;
  const responseEntries = Object.entries(assessment.rawResponses).filter(([, v]) => v !== "");

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin/character-assessments"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to Character Assessments
        </Link>
        <h1 className="mt-4 font-serif text-3xl">{assessment.participantName ?? "Unmatched response"}</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {assessment.sourceEmail ?? "No email in row"}
          {assessment.sourceCompletedAt ? ` · completed ${new Date(assessment.sourceCompletedAt).toLocaleString()}` : ""}
          {assessment.masterProfileId ? (
            <>
              {" · "}
              <Link href={`/admin/participants/${assessment.masterProfileId}`} className="text-(--color-accent) hover:underline">
                Open profile
              </Link>
            </>
          ) : null}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CharacterAssessmentControls
              id={assessment.id}
              matched={!!assessment.masterProfileId}
              reportFileName={assessment.reportFileName}
              reportDownloadUrl={reportDownloadUrl}
              released={assessment.released}
              defaultEmail={assessment.sourceEmail ?? ""}
            />
          </Card>

          <Card>
            <h2 className="font-serif text-lg">Scores</h2>
            <p className="mt-2 text-sm text-(--color-ink-muted)">
              {assessment.hasScores
                ? "Scored."
                : "Not scored yet. Scoring is added once the scoring spreadsheet is provided."}
            </p>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg">Responses as imported</h2>
            <p className="mt-1 text-xs text-(--color-ink-muted)">Every column from the LimeSurvey export, unchanged.</p>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {responseEntries.map(([question, answer]) => (
                <div key={question}>
                  <dt className="text-xs text-(--color-ink-muted)">{question}</dt>
                  <dd className="break-words text-(--color-ink)">{answer}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </Container>
    </main>
  );
}
