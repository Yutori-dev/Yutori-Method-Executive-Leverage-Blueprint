import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  complete: "Complete",
  archived: "Archived",
};

export default async function AdminSessionsPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: sessions }, { data: enrollments }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, organization, event_date, status, join_code")
      .order("created_at", { ascending: false }),
    supabase.from("participant_sessions").select("session_id"),
  ]);

  const countBySessionId = new Map<string, number>();
  for (const enrollment of enrollments ?? []) {
    countBySessionId.set(
      enrollment.session_id,
      (countBySessionId.get(enrollment.session_id) ?? 0) + 1,
    );
  }

  return (
    <main className="py-16">
      <Container>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl">Sessions</h1>
          <Link href="/admin/sessions/new">
            <Button>New session</Button>
          </Link>
        </div>

        <div className="mt-8 space-y-3">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => {
              const participantCount = countBySessionId.get(session.id) ?? 0;
              return (
                <Link key={session.id} href={`/admin/sessions/${session.id}`}>
                  <Card className="flex items-center justify-between transition-colors hover:border-(--color-accent)">
                    <div>
                      <p className="font-medium">{session.name}</p>
                      <p className="mt-1 text-sm text-(--color-ink-muted)">
                        {session.organization ? `${session.organization} · ` : ""}
                        Join code: {session.join_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
                        {statusLabel[session.status] ?? session.status}
                      </p>
                      <p className="mt-1 text-sm text-(--color-ink-muted)">
                        {participantCount} registered
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })
          ) : (
            <Card>
              <p className="text-sm text-(--color-ink-muted)">
                No sessions yet. Create one to get a join link for participants.
              </p>
            </Card>
          )}
        </div>
      </Container>
    </main>
  );
}
