-- EA Leverage & Orchestration Audit dyad resolution: found via live
-- verification that the naive implementation (the submitting participant's
-- own Supabase client reading their paired counterpart's
-- participant_sessions row directly) is blocked by RLS -- sibling-read
-- (can_read_participant_session) only covers the same master profile's own
-- registrations, not a DIFFERENT, merely-paired profile's. Rather than
-- widening that policy (which would let any paired participant read their
-- counterpart's session data broadly, well beyond what dyad matching
-- needs), this is one narrow security-definer function: given a session
-- id, return only the counterpart's participant_session_id for that
-- session, nothing else.
create or replace function public.resolve_dyad_counterpart_session(p_session_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_my_master_profile_id uuid;
  v_paired_master_profile_id uuid;
  v_counterpart_session_id uuid;
begin
  select master_profile_id into v_my_master_profile_id
  from public.participants
  where id = auth.uid();

  if v_my_master_profile_id is null then
    return null;
  end if;

  select paired_master_profile_id into v_paired_master_profile_id
  from public.master_profiles
  where id = v_my_master_profile_id;

  if v_paired_master_profile_id is null then
    return null;
  end if;

  select ps.id into v_counterpart_session_id
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.session_id = p_session_id
    and p.master_profile_id = v_paired_master_profile_id
  limit 1;

  return v_counterpart_session_id;
end;
$$;

revoke all on function public.resolve_dyad_counterpart_session(uuid) from public;
grant execute on function public.resolve_dyad_counterpart_session(uuid) to authenticated;

comment on function public.resolve_dyad_counterpart_session(uuid) is
  'Used only by the EA Leverage & Orchestration Audit submit action to '
  'link a Visionary and their paired EA''s submissions for the same '
  'session. Deliberately returns only an id, not the counterpart''s row --'
  ' this is not a general cross-profile read grant.';
