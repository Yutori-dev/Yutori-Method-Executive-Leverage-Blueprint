import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

export default async function DashboardIndexPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("session_id, last_active_at")
    .eq("participant_id", user.id)
    .order("last_active_at", { ascending: false });

  if (!enrollments || enrollments.length === 0) {
    return (
      <main className="flex flex-1 items-center">
        <Container narrow className="py-20 text-center">
          <p className="text-(--color-ink-muted)">
            You&apos;re signed in, but not yet registered for a workshop session. Use the
            session link your facilitator shared with you.
          </p>
        </Container>
      </main>
    );
  }

  if (enrollments.length === 1) {
    redirect(`/dashboard/${enrollments[0].session_id}`);
  }

  const sessionIds = enrollments.map((e) => e.session_id);
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, organization")
    .in("id", sessionIds);

  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        <h1 className="font-serif text-2xl">Your sessions</h1>
        <div className="mt-6 space-y-3">
          {enrollments.map((enrollment) => {
            const session = sessionById.get(enrollment.session_id);
            return (
              <Link key={enrollment.session_id} href={`/dashboard/${enrollment.session_id}`}>
                <Card className="transition-colors hover:border-(--color-accent)">
                  <p className="font-medium">{session?.name}</p>
                  {session?.organization ? (
                    <p className="text-sm text-(--color-ink-muted)">{session.organization}</p>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
