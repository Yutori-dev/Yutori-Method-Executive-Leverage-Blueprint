-- Real bug found during live verification: participants_select's own USING
-- clause queried public.participants directly (to find the caller's own
-- master_profile_id), which re-triggers participants_select on that very
-- subquery -> infinite recursion. Fix: read the caller's own
-- master_profile_id through a security definer helper (bypasses RLS for
-- its own internal query, same pattern can_read_participant_session
-- already uses correctly) instead of an inline self-referencing subquery.
create or replace function public.my_master_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select master_profile_id from public.participants where id = auth.uid();
$$;

comment on function public.my_master_profile_id() is
  'Security-definer so RLS policies on participants can read the callers '
  'own master_profile_id without re-triggering participants_select on '
  'themselves (that recursion is exactly the bug this migration fixes).';

drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants
  for select using (
    public.is_admin()
    or id = auth.uid()
    or master_profile_id = public.my_master_profile_id()
  );
