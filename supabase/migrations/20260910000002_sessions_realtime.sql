-- Bug fix (client report, 2026-08-31): participants sitting on a holding
-- screen never got auto-navigated when a facilitator unlocked the next
-- module -- always required a manual refresh. Root cause: SessionGateWatcher.tsx
-- (src/components/participant/SessionGateWatcher.tsx) subscribes to
-- postgres_changes on public.sessions, and admin_unlock_next_module does
-- correctly update that row -- but public.sessions was never added to the
-- supabase_realtime publication (only participant_sessions and
-- participant_module_progress were, in 20260901000002_secondary_signal_and_realtime.sql).
-- Postgres logical replication only emits change events for published
-- tables, so this subscription could never fire. No app code was wrong;
-- the table was just never wired into realtime.

alter publication supabase_realtime add table public.sessions;
