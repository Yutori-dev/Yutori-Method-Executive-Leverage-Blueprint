-- Slice 1, narrow RLS rollout: only participants_select and
-- participant_sessions_select move to the master-profile-sibling read
-- model in this migration. The remaining ~13 downstream _select policies
-- (participant_module_progress, responses, etc.) are deliberately left
-- untouched here -- rolled out separately once this narrow slice is
-- verified live against real seeded accounts (see plan). Every write
-- policy stays self-scoped (id = auth.uid()) unchanged.

-- Centralized helper so the sibling-read predicate exists in exactly one
-- place -- every downstream policy (this migration and the later rollout)
-- calls this rather than repeating the join, so there's one thing to audit
-- and one place to fix if the merge model ever changes.
create or replace function public.can_read_participant_session(p_participant_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.participant_sessions ps
    join public.participants me on me.id = auth.uid()
    join public.participants owner on owner.id = ps.participant_id
    where ps.id = p_participant_session_id
      and owner.master_profile_id = me.master_profile_id
  );
$$;

comment on function public.can_read_participant_session(uuid) is
  'True if the caller is an admin, or the given participant_sessions row '
  'belongs to a participants row sharing the callers own master_profile_id '
  '(i.e. an admin has explicitly merged them as the same person). Centralized '
  'so every downstream _select policy shares one predicate instead of '
  'fifteen hand-copied joins.';

drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants
  for select using (
    public.is_admin()
    or id = auth.uid()
    or exists (
      select 1 from public.participants me
      where me.id = auth.uid() and me.master_profile_id = participants.master_profile_id
    )
  );

drop policy if exists participant_sessions_select on public.participant_sessions;
create policy participant_sessions_select on public.participant_sessions
  for select using (public.can_read_participant_session(id));
