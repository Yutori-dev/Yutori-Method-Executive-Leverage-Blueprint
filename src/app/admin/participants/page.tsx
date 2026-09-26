import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchMasterProfiles } from "@/lib/data/masterProfile";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

export default async function MasterParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; session?: string }>;
}) {
  const { q, session: sessionId } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const [{ data: sessions }, profiles] = await Promise.all([
    supabase.from("sessions").select("id, name").order("created_at", { ascending: false }),
    searchMasterProfiles({ query: q, sessionId }),
  ]);

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to admin
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Participants</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Search across every session by name, email, or filter to one session. Each row is one
          person -- multiple registrations under different emails already merged into one profile
          show together.
        </p>

        <Card className="mt-6">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex-1" style={{ minWidth: "200px" }}>
              <label htmlFor="q" className="block text-xs font-medium text-(--color-ink-muted)">
                Name or email
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search..."
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
            <div style={{ minWidth: "200px" }}>
              <label htmlFor="session" className="block text-xs font-medium text-(--color-ink-muted)">
                Session
              </label>
              <select
                id="session"
                name="session"
                defaultValue={sessionId ?? ""}
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              >
                <option value="">All sessions</option>
                {(sessions ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-(--color-hairline) px-3.5 py-2 text-sm font-medium text-(--color-ink) transition-colors hover:border-(--color-accent)"
            >
              Search
            </button>
            {(q || sessionId) ? (
              <Link
                href="/admin/participants"
                className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
              >
                Clear
              </Link>
            ) : null}
          </form>
        </Card>

        <div className="mt-6 space-y-2">
          {profiles.length === 0 ? (
            <Card>
              <p className="text-sm text-(--color-ink-muted)">
                {q || sessionId ? "No participants match that search." : "No participants registered yet."}
              </p>
            </Card>
          ) : (
            profiles.map((profile) => {
              const primary = profile.participants[0];
              const others = profile.participants.slice(1);
              return (
                <Card key={profile.masterProfileId}>
                  <Link
                    href={`/admin/participants/${profile.masterProfileId}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-(--color-accent)">
                        {primary.firstName} {primary.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-(--color-ink-muted)">
                        {primary.email}
                        {others.length > 0 ? ` + ${others.length} more registration${others.length > 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-(--color-ink-muted)">
                      {profile.sessionCount} session{profile.sessionCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </Card>
              );
            })
          )}
        </div>
      </Container>
    </main>
  );
}
