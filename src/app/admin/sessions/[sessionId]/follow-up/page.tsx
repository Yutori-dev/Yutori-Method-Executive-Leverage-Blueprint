import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { FollowUpStatusSelect } from "@/components/admin/FollowUpStatusSelect";
import type { FollowUpStatus } from "@/types/database";

/** Brief section 15 / A12: "Follow-Up Interest Queue" as its own admin
 * screen, in addition to the "Discuss?" column on the main roster. */
export default async function FollowUpQueuePage({
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

  const { data: interests } =
    participantSessionIds.length > 0
      ? await supabase
          .from("follow_up_interests")
          .select("id, participant_session_id, requested_at, status")
          .in("participant_session_id", participantSessionIds)
          .order("requested_at", { ascending: false })
      : { data: [] };

  const participantIds = (enrollments ?? []).map((e) => e.participant_id);
  const { data: participants } =
    participantIds.length > 0
      ? await supabase.from("participants").select("id, first_name, last_name, email").in("id", participantIds)
      : { data: [] };

  const participantIdByPs = new Map((enrollments ?? []).map((e) => [e.id, e.participant_id]));
  const participantById = new Map((participants ?? []).map((p) => [p.id, p]));

  return (
    <main className="py-16">
      <Container>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to session
        </Link>

        <h1 className="mt-4 font-serif text-3xl">{session.name} — Follow-up queue</h1>

        <Card className="mt-8">
          {interests && interests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Requested</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {interests.map((interest) => {
                    const participantId = participantIdByPs.get(interest.participant_session_id);
                    const participant = participantId ? participantById.get(participantId) : null;
                    return (
                      <tr key={interest.id} className="border-b border-(--color-hairline)/60">
                        <td className="py-2 pr-4">
                          {participant?.first_name} {participant?.last_name}
                        </td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">{participant?.email}</td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">
                          {new Date(interest.requested_at).toLocaleString()}
                        </td>
                        <td className="py-2">
                          <FollowUpStatusSelect
                            followUpId={interest.id}
                            status={interest.status as FollowUpStatus}
                            sessionId={sessionId}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-(--color-ink-muted)">No follow-up requests yet.</p>
          )}
        </Card>
      </Container>
    </main>
  );
}
