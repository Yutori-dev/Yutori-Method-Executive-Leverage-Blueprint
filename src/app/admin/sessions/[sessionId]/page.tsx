import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ModuleStateBadge } from "@/components/ui/ModuleStateBadge";
import { SessionStatusSelect } from "@/components/admin/SessionStatusSelect";
import { UnlockModuleControl } from "@/components/admin/UnlockModuleControl";
import { RevealArchitectureControl } from "@/components/admin/RevealArchitectureControl";
import { RevealZoneOfInvestmentControl } from "@/components/admin/RevealZoneOfInvestmentControl";
import { UnlockWhiteWhaleControl } from "@/components/admin/UnlockWhiteWhaleControl";
import { UnlockLeadershipWiringControl } from "@/components/admin/UnlockLeadershipWiringControl";
import { LiveRosterRefresher } from "@/components/admin/LiveRosterRefresher";
import type { ModuleDisplayState } from "@/lib/moduleState";
import type { SessionStatus } from "@/types/database";

export default async function SessionControlPanelPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: session }, { data: modules }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
    supabase.from("modules").select("*").eq("active", true).order("sort_order", { ascending: true }),
  ]);

  if (!session || !modules) notFound();

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id, participant_id, current_module_id, completion_state, last_active_at")
    .eq("session_id", sessionId)
    .order("last_active_at", { ascending: false });

  const participantIds = [...new Set((enrollments ?? []).map((e) => e.participant_id))];
  const participantSessionIds = (enrollments ?? []).map((e) => e.id);

  const [{ data: participants }, { data: recommendations }, { data: followUps }] = await Promise.all([
    participantIds.length > 0
      ? supabase.from("participants").select("id, first_name, last_name, email").in("id", participantIds)
      : Promise.resolve({ data: [] }),
    participantSessionIds.length > 0
      ? supabase.from("architecture_recommendations").select("participant_session_id").in("participant_session_id", participantSessionIds)
      : Promise.resolve({ data: [] }),
    participantSessionIds.length > 0
      ? supabase.from("follow_up_interests").select("participant_session_id").in("participant_session_id", participantSessionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const participantById = new Map((participants ?? []).map((p) => [p.id, p]));
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const blueprintReadyIds = new Set((recommendations ?? []).map((r) => r.participant_session_id));
  const discussRequestedIds = new Set((followUps ?? []).map((f) => f.participant_session_id));

  const roster = (enrollments ?? []).map((enrollment) => ({
    ...enrollment,
    participant: participantById.get(enrollment.participant_id) ?? null,
    currentModuleName: enrollment.current_module_id
      ? (moduleById.get(enrollment.current_module_id)?.name ?? null)
      : null,
    blueprintReady: blueprintReadyIds.has(enrollment.id),
    discussRequested: discussRequestedIds.has(enrollment.id),
  }));

  const activeModule = modules.find((m) => m.id === session.active_module_id);
  const nextModule = modules
    .filter((m) => !m.requires_live_workshop)
    .find((m) => !activeModule || m.sort_order > activeModule.sort_order);
  const architectureModule = modules.find((m) => m.key === "architecture");
  const architectureUnlocked = Boolean(
    architectureModule && activeModule && architectureModule.sort_order <= activeModule.sort_order,
  );
  const currentStructureModule = modules.find((m) => m.key === "current_structure");
  const currentStructureUnlocked = Boolean(
    currentStructureModule && activeModule && currentStructureModule.sort_order <= activeModule.sort_order,
  );
  const operatingAltitudeModule = modules.find((m) => m.key === "operating_altitude");
  const operatingAltitudeUnlocked = Boolean(
    operatingAltitudeModule && activeModule && operatingAltitudeModule.sort_order <= activeModule.sort_order,
  );

  const joinUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/join/${session.join_code}`
      : `/join/${session.join_code}`;

  return (
    <main className="py-16">
      <Container>
        <LiveRosterRefresher sessionId={sessionId} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">{session.name}</h1>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              {session.organization ? `${session.organization} · ` : ""}Join link:{" "}
              <code className="rounded bg-(--color-accent-soft) px-1.5 py-0.5">{joinUrl}</code>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/sessions/${sessionId}/aggregate`}
              className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Aggregate results
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/diagnostic`}
              className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Executive Leverage Diagnostic
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/zone-of-investment`}
              className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Zone of Investment
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/present`}
              className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Presentation mode
            </Link>
            <Link
              href={`/admin/sessions/${sessionId}/follow-up`}
              className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Follow-up queue
            </Link>
            <a
              href={`/admin/sessions/${sessionId}/export`}
              className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Export CSV
            </a>
            <Link
              href={`/admin/sessions/${sessionId}/edit`}
              className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Edit
            </Link>
            <SessionStatusSelect sessionId={sessionId} status={session.status as SessionStatus} />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <h2 className="font-serif text-xl">Module control</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              Unlocking is cohort-wide and moves forward only.
            </p>

            <div className="mt-6 space-y-2">
              {modules.map((module) => {
                const state: ModuleDisplayState = module.requires_live_workshop
                  ? "LOCKED"
                  : activeModule && module.sort_order <= activeModule.sort_order
                    ? "OPEN"
                    : "LOCKED";
                return (
                  <div
                    key={module.id}
                    className="flex items-center justify-between rounded-lg border border-(--color-hairline) px-4 py-2.5"
                  >
                    <span className="text-sm">{module.name}</span>
                    <ModuleStateBadge state={state} />
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <UnlockModuleControl sessionId={sessionId} nextModuleName={nextModule?.name ?? null} />
            </div>

            {operatingAltitudeUnlocked || session.white_whale_unlocked ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">White Whale unlock</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Separate from module unlocking -- comes after the Executive Leverage Diagnostic
                  within Operating Altitude.
                </p>
                <div className="mt-3">
                  <UnlockWhiteWhaleControl sessionId={sessionId} alreadyUnlocked={session.white_whale_unlocked} />
                </div>
              </div>
            ) : null}

            {operatingAltitudeUnlocked || session.leadership_wiring_unlocked ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">Leadership Wiring unlock</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  The last of the three Operating Altitude activities -- completing it marks the
                  module complete.
                </p>
                <div className="mt-3">
                  <UnlockLeadershipWiringControl
                    sessionId={sessionId}
                    alreadyUnlocked={session.leadership_wiring_unlocked}
                  />
                </div>
              </div>
            ) : null}

            {currentStructureUnlocked || session.zone_of_investment_revealed ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">Zone of Investment reveal</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Separate from module unlocking -- reveals each participant&apos;s personalized
                  matrix.
                </p>
                <div className="mt-3">
                  <RevealZoneOfInvestmentControl
                    sessionId={sessionId}
                    alreadyRevealed={session.zone_of_investment_revealed}
                  />
                </div>
              </div>
            ) : null}

            {architectureUnlocked || session.architecture_revealed ? (
              <div className="mt-6 border-t border-(--color-hairline) pt-6">
                <h3 className="text-sm font-medium">Architecture reveal</h3>
                <p className="mt-1 text-xs text-(--color-ink-muted)">
                  Separate from module unlocking -- reveals each participant&apos;s calculated
                  recommendation.
                </p>
                <div className="mt-3">
                  <RevealArchitectureControl
                    sessionId={sessionId}
                    alreadyRevealed={session.architecture_revealed}
                  />
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <h2 className="font-serif text-xl">Participants</h2>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              {roster?.length ?? 0} registered
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Current module</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Blueprint ready?</th>
                    <th className="pb-2 pr-4">Discuss?</th>
                    <th className="pb-2">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {roster && roster.length > 0 ? (
                    roster.map((row) => (
                      <tr key={row.id} className="border-b border-(--color-hairline)/60 hover:bg-(--color-accent-soft)/40">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/admin/sessions/${sessionId}/participants/${row.id}`}
                            className="block text-(--color-accent) hover:underline"
                          >
                            {row.participant?.first_name} {row.participant?.last_name}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-(--color-ink-muted)">
                          {row.participant?.email}
                        </td>
                        <td className="py-2 pr-4">{row.currentModuleName ?? "—"}</td>
                        <td className="py-2 pr-4 capitalize">
                          {row.completion_state.replace("_", " ")}
                        </td>
                        <td className="py-2 pr-4">{row.blueprintReady ? "Yes" : "—"}</td>
                        <td className="py-2 pr-4">{row.discussRequested ? "Yes" : "—"}</td>
                        <td className="py-2 text-(--color-ink-muted)">
                          {new Date(row.last_active_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-(--color-ink-muted)">
                        No one has registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
