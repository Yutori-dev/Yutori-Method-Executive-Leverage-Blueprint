-- Merging a registration into another profile leaves the source profile with
-- no registrations (every participant gets a 1:1 profile at signup). Those
-- empty profiles would pile up. From now on they are removed as part of the
-- merge -- but only when nothing else hangs off them: a profile that still has
-- uploaded files is kept, since participant_files cascades on delete and the
-- storage paths are keyed by profile id, so removing it would orphan the files.
--
-- Deliberately does NOT bulk-delete profiles that are already empty from
-- earlier merges; that is a separate, reviewed step.
create or replace function public.delete_master_profile_if_empty(p_master_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_master_profile_id is null then return; end if;
  if exists (select 1 from public.participants where master_profile_id = p_master_profile_id) then return; end if;
  if exists (select 1 from public.participant_files where master_profile_id = p_master_profile_id) then return; end if;
  delete from public.master_profiles where id = p_master_profile_id;
end;
$$;

revoke all on function public.delete_master_profile_if_empty(uuid) from public, anon, authenticated;

-- Merge RPC: same as before, plus tidy the emptied source profile.
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

  perform public.delete_master_profile_if_empty(v_old_profile_id);

  return v_row;
end;
$$;

-- Account deletion path: same tidy-up.
create or replace function public.participants_cleanup_master_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.delete_master_profile_if_empty(old.master_profile_id);
  return null;
end;
$$;

drop trigger if exists participants_cleanup_master_profile on public.participants;
create trigger participants_cleanup_master_profile
  after delete on public.participants
  for each row execute function public.participants_cleanup_master_profile();
