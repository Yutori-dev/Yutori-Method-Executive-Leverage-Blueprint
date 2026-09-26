-- Real bug found via extensive live debugging: architecture_recommendations_select's
-- reveal-check EXISTS clause joined public.sessions directly. That join runs as
-- the calling participant (not security definer), so it's subject to
-- sessions_select's OWN RLS policy (only visible to someone actually enrolled
-- in that session). A merged sibling who was never personally enrolled in
-- session S -- they only share master_profile_id with the person who was --
-- gets silently filtered out of the sessions table by ITS OWN RLS before my
-- exists() clause ever gets a chance to evaluate the reveal flag, so the
-- whole policy evaluated false even though can_read_participant_session (a
-- security definer function, correctly bypassing RLS on its internal
-- lookups) returned true. This is the same category of bug the security
-- definer pattern already exists to prevent -- it just wasn't applied to
-- this one nested table access.
create or replace function public.is_architecture_revealed_for_session(p_participant_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(s.architecture_revealed, false)
  from public.participant_sessions ps
  join public.sessions s on s.id = ps.session_id
  where ps.id = p_participant_session_id;
$$;

comment on function public.is_architecture_revealed_for_session(uuid) is
  'Security definer so this reveal check bypasses sessions RLS internally -- '
  'without this, a merged sibling who was never personally enrolled in the '
  'session gets silently filtered out of the sessions table by its own RLS '
  'before the reveal flag is even read, and the whole policy evaluates false.';

drop policy if exists architecture_recommendations_select on public.architecture_recommendations;
create policy architecture_recommendations_select on public.architecture_recommendations
  for select using (
    public.is_admin()
    or (
      public.can_read_participant_session(participant_session_id)
      and public.is_architecture_revealed_for_session(participant_session_id)
    )
  );
