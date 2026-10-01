-- Found via live verification: master_profiles is admin-only for SELECT
-- too (migration 20260917000017), so the previous version of
-- resolve_dyad_counterpart_session's caller (leverageAudit.ts) couldn't
-- even read its OWN paired_master_profile_id to decide whether to call the
-- RPC in the first place -- that read was silently filtered to zero rows
-- by RLS, not an error, so it failed quietly. Fix: the RPC itself (already
-- security definer) also returns the paired profile's id, so the caller
-- never needs a direct master_profiles read at all. Return type changes
-- from scalar uuid to a row set, so the old function must be dropped first
-- -- `create or replace` can't change a function's return shape.
drop function if exists public.resolve_dyad_counterpart_session(uuid);

create function public.resolve_dyad_counterpart_session(p_session_id uuid)
returns table (counterpart_session_id uuid, counterpart_master_profile_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_my_master_profile_id uuid;
  v_paired_master_profile_id uuid;
begin
  select master_profile_id into v_my_master_profile_id
  from public.participants
  where id = auth.uid();

  if v_my_master_profile_id is null then
    return;
  end if;

  select paired_master_profile_id into v_paired_master_profile_id
  from public.master_profiles
  where id = v_my_master_profile_id;

  if v_paired_master_profile_id is null then
    return;
  end if;

  return query
  select ps.id, v_paired_master_profile_id
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.session_id = p_session_id
    and p.master_profile_id = v_paired_master_profile_id
  limit 1;
end;
$$;

revoke all on function public.resolve_dyad_counterpart_session(uuid) from public;
grant execute on function public.resolve_dyad_counterpart_session(uuid) to authenticated;
