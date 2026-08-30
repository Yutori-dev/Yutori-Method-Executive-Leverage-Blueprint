import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

export default async function WorkshopFeedbackReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  if (!session) notFound();

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id, participant_id")
    .eq("session_id", sessionId);

  const participantSessionIds = (enrollments ?? []).map((e) => e.id);

  const { data: responses } =
    participantSessionIds.length > 0
      ? await supabase
          .from("workshop_feedback")
          .select("id, participant_session_id, rating, written_feedback, permission, submitted_at")
          .in("participant_session_id", participantSessionIds)
          .order("submitted_at", { ascending: false })
      : { data: [] };

  const participantIds = (enrollments ?? []).map((e) => e.participant_id);
  const { data: participants } =
    participantIds.length > 0
      ? await supabase.from("participants").select("id, first_name, last_name").in("id", participantIds)
      : { data: [] };

  const participantIdByPs = new Map((enrollments ?? []).map((e) => [e.id, e.participant_id]));
  const participantById = new Map((participants ?? []).map((p) => [p.id, p]));

  const count = responses?.length ?? 0;
  const averageRating = count > 0 ? (responses!.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1) : null;

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to session
        </Link>

        <h1 className="mt-4 font-serif text-3xl">{session.name} — Workshop feedback</h1>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-2xl text-(--color-ink)">{count}</p>
            <p className="mt-1 text-xs text-(--color-ink-muted)">Responses</p>
          </Card>
          <Card>
            <p className="text-2xl text-(--color-ink)">{averageRating ?? "—"}</p>
            <p className="mt-1 text-xs text-(--color-ink-muted)">Average rating</p>
          </Card>
        </div>

        <Card className="mt-6">
          {responses && responses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Rating</th>
                    <th className="pb-2 pr-4">Permission</th>
                    <th className="pb-2 pr-4">Feedback</th>
                    <th className="pb-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => {
                    const participantId = participantIdByPs.get(response.participant_session_id);
                    const participant = participantId ? participantById.get(participantId) : null;
                    return (
                      <tr key={response.id} className="border-b border-(--color-hairline)/60 align-top">
                        <td className="py-2 pr-4">
                          {participant?.first_name} {participant?.last_name}
                        </td>
                        <td className="py-2 pr-4">{"★".repeat(response.rating)}</td>
                        <td className="py-2 pr-4 capitalize">
                          {response.permission === "named" ? "With name" : "Anonymous"}
                        </td>
                        <td className="py-2 pr-4 max-w-md text-(--color-ink-muted)">
                          {response.written_feedback ?? "—"}
                        </td>
                        <td className="py-2 text-(--color-ink-muted)">
                          {new Date(response.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-(--color-ink-muted)">No feedback submitted yet.</p>
          )}
        </Card>
      </Container>
    </main>
  );
}
