-- The sibling-read model (20260917000002 / 000007) covered participants,
-- participant_sessions, and the 13 downstream participant_session_id-keyed
-- tables, but not sessions itself: sessions_select still required
-- ps.participant_id = auth.uid() directly, i.e. strictly the caller's own
-- enrollment. A merged sibling could read another registration's
-- participant_sessions row but not the session it points at, so anything
-- joining through to session name/status/blueprint_revealed silently came
-- back empty. Same security-definer helper pattern as
-- can_read_participant_session, for the same reason (a plain inline join
-- would re-trigger participant_sessions' own RLS from within this policy).
create or replace function public.can_read_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.participant_sessions ps
    join public.participants owner on owner.id = ps.participant_id
    join public.participants me on me.id = auth.uid()
    where ps.session_id = p_session_id
      and owner.master_profile_id = me.master_profile_id
  );
$$;

comment on function public.can_read_session(uuid) is
  'True if the caller is an admin, or any registration sharing the '
  'callers master_profile_id (including the caller themselves) is enrolled '
  'in the given session.';

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select using (public.can_read_session(id));
