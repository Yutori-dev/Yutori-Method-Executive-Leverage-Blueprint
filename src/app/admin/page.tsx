import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdminQuickLinks } from "@/components/admin/AdminQuickLinks";
import { Disclosure } from "@/components/ui/Disclosure";

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

  const activeSessions = (sessions ?? []).filter((s) => s.status !== "archived");
  const archivedSessions = (sessions ?? []).filter((s) => s.status === "archived");

  return (
    <main className="py-16">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-serif text-3xl">Sessions</h1>
          <Link href="/admin/sessions/new">
            <Button>New session</Button>
          </Link>
        </div>

        <div className="mt-8">
          <Disclosure label="Analytics &amp; configuration">
            <AdminQuickLinks />
          </Disclosure>
        </div>

        <div className="mt-8 space-y-3">
          {activeSessions.length > 0 ? (
            activeSessions.map((session) => <SessionRow key={session.id} session={session} participantCount={countBySessionId.get(session.id) ?? 0} />)
          ) : (
            <Card>
              <p className="text-sm text-(--color-ink-muted)">
                No sessions yet. Create one to get a join link for participants.
              </p>
            </Card>
          )}
        </div>

        {archivedSessions.length > 0 ? (
          <div className="mt-8">
            <Disclosure label={`Archived sessions (${archivedSessions.length})`}>
              <div className="space-y-3">
                {archivedSessions.map((session) => (
                  <SessionRow key={session.id} session={session} participantCount={countBySessionId.get(session.id) ?? 0} />
                ))}
              </div>
            </Disclosure>
          </div>
        ) : null}
      </Container>
    </main>
  );
}

function SessionRow({
  session,
  participantCount,
}: {
  session: { id: string; name: string; organization: string | null; join_code: string; status: string };
  participantCount: number;
}) {
  return (
    <Link href={`/admin/sessions/${session.id}`}>
      <Card className="flex flex-col gap-2 transition-colors hover:border-(--color-accent) sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="font-medium">{session.name}</p>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            {session.organization ? `${session.organization} · ` : ""}
            Join code: {session.join_code}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">
            {statusLabel[session.status] ?? session.status}
          </p>
          <p className="mt-1 text-sm text-(--color-ink-muted)">{participantCount} registered</p>
        </div>
      </Card>
    </Link>
  );
}
