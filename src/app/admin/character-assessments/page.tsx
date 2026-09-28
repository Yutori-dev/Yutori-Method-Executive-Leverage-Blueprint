import Link from "next/link";
import { listCharacterAssessments } from "@/lib/data/characterAssessments";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CharacterAssessmentImportForm } from "@/components/admin/CharacterAssessmentImportForm";

export default async function CharacterAssessmentsPage() {
  const assessments = await listCharacterAssessments();
  const unmatched = assessments.filter((a) => !a.masterProfileId).length;

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to admin
        </Link>
        <h1 className="mt-4 font-serif text-3xl">Character Assessments</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Import a LimeSurvey CSV export. Each completed response is matched to a participant by email and
          attached to their profile.
        </p>

        <Card className="mt-6">
          <h2 className="font-serif text-lg">Import from LimeSurvey</h2>
          <div className="mt-3">
            <CharacterAssessmentImportForm />
          </div>
        </Card>

        <h2 className="mt-10 font-serif text-lg">
          Imported ({assessments.length}){unmatched > 0 ? ` · ${unmatched} need matching` : ""}
        </h2>
        <div className="mt-3 space-y-2">
          {assessments.length === 0 ? (
            <Card>
              <p className="text-sm text-(--color-ink-muted)">Nothing imported yet.</p>
            </Card>
          ) : (
            assessments.map((a) => (
              <Card key={a.id}>
                <Link href={`/admin/character-assessments/${a.id}`} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-(--color-accent)">
                      {a.participantName ?? "Not matched"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-(--color-ink-muted)">
                      {a.sourceEmail ?? "No email in row"}
                      {a.sourceCompletedAt ? ` · completed ${new Date(a.sourceCompletedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-(--color-ink-muted)">
                    {!a.masterProfileId ? (
                      <span className="rounded-full border border-[#8a3324] px-2.5 py-0.5 text-[#8a3324]">Needs match</span>
                    ) : null}
                    <span>{a.hasScores ? "Scored" : "Not scored"}</span>
                    <span>·</span>
                    <span>{a.released ? "Released" : a.reportFileName ? "Report attached" : "No report"}</span>
                  </div>
                </Link>
              </Card>
            ))
          )}
        </div>
      </Container>
    </main>
  );
}
