-- admin_merge_participant: the only sanctioned way to move a participant
-- between master_profiles -- the guard trigger on public.participants
-- blocks every other path (see 20260917000001). Matches the existing
-- admin-RPC shape (security invoker, explicit is_admin() check) used by
-- admin_unlock_next_module and friends.
create or replace function public.admin_merge_participant(
  p_participant_id uuid,
  p_target_master_profile_id uuid
)
returns public.participants
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old_profile_id uuid;
  v_row public.participants;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can merge participant profiles.';
  end if;

  if not exists (select 1 from public.master_profiles where id = p_target_master_profile_id) then
    raise exception 'Target master profile does not exist.';
  end if;

  select master_profile_id into v_old_profile_id
  from public.participants
  where id = p_participant_id;

  if v_old_profile_id is null then
    raise exception 'Participant not found.';
  end if;

  if v_old_profile_id = p_target_master_profile_id then
    select * into v_row from public.participants where id = p_participant_id;
    return v_row;
  end if;

  insert into public.master_profile_merge_log (
    admin_id, participant_id, old_master_profile_id, new_master_profile_id
  ) values (
    auth.uid(), p_participant_id, v_old_profile_id, p_target_master_profile_id
  );

  update public.participants
  set master_profile_id = p_target_master_profile_id
  where id = p_participant_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.admin_merge_participant(uuid, uuid) is
  'Admin-only. Repoints one participants row onto an existing master_profiles '
  'row and logs the change. This is what makes a merge real for the '
  'participant, not just an admin-side label: RLS grants sibling read the '
  'moment two participants share a master_profile_id.';
