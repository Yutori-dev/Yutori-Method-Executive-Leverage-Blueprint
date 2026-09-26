-- Real bug found during live verification: admin_merge_participant ran
-- security invoker, so its internal UPDATE was subject to
-- participants_update_self (using (id = auth.uid())) -- which only ever
-- allows a row to update itself. There is no admin-write policy on
-- participants at all. RLS doesn't error on a filtered UPDATE, it just
-- silently affects zero rows -- the RPC reported success while doing
-- nothing. Fix: security definer, matching ensure_participant and
-- can_read_participant_session -- safe here because is_admin() is already
-- explicitly checked at the top of the function body before anything
-- else runs, so this doesn't bypass authorization, only the row-level
-- filter for a write that's already been authorized.
create or replace function public.admin_merge_participant(
  p_participant_id uuid,
  p_target_master_profile_id uuid
)
returns public.participants
language plpgsql
security definer
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
