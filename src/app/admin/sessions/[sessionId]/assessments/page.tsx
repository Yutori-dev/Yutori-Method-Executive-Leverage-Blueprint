import Link from "next/link";
import { notFound } from "next/navigation";
import { DASHBOARD_ASSESSMENTS, getDashboardData, getSessionName } from "@/lib/data/assessmentDashboards";
import { completion } from "@/lib/assessmentStats";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

export default async function AssessmentDashboardsIndex({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const sessionName = await getSessionName(sessionId);
  if (!sessionName) notFound();

  const summaries = await Promise.all(
    DASHBOARD_ASSESSMENTS.map(async (a) => {
      const data = await getDashboardData(sessionId, a.key);
      return { ...a, c: data ? completion(data.rows) : null };
    }),
  );

  return (
    <main className="py-16">
      <Container>
        <Link href={`/admin/sessions/${sessionId}`} className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)">
          ← Back to session
        </Link>
        <h1 className="mt-4 font-serif text-3xl">Assessment dashboards</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">{sessionName}. Facilitator-only views; participants never see these.</p>
        <div className="mt-6 space-y-2">
          {summaries.map((a) => (
            <Card key={a.key}>
              <Link href={`/admin/sessions/${sessionId}/assessments/${a.key}`} className="flex items-center justify-between gap-4">
                <span className="text-sm text-(--color-accent)">{a.label}</span>
                <span className="text-xs text-(--color-ink-muted)">
                  {a.c ? `${a.c.completed} completed / ${a.c.started} started` : "Not set up"}
                </span>
              </Link>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
