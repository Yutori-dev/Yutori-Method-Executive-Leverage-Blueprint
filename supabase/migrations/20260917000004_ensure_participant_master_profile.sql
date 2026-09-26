-- Real gap found during live verification of the master-profile schema
-- (20260917000001 made participants.master_profile_id not null, but
-- ensure_participant() -- the RPC every real signup goes through -- never
-- created one). Without this fix, every new participant signup would fail.
create or replace function public.ensure_participant(
  p_first_name text,
  p_last_name text,
  p_privacy_consent boolean default false
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_master_profile_id uuid;
  v_row public.participants;
begin
  select email into v_email from auth.users where id = auth.uid();

  if v_email is null then
    raise exception 'No authenticated user.';
  end if;

  -- Reuse the existing profile on a re-call (login again / edit intake)
  -- rather than minting an orphan master_profiles row every time.
  select master_profile_id into v_master_profile_id
  from public.participants
  where id = auth.uid();

  if v_master_profile_id is null then
    insert into public.master_profiles default values
    returning id into v_master_profile_id;
  end if;

  insert into public.participants (
    id, first_name, last_name, email, last_login, privacy_consent_given_at, privacy_consent_version, master_profile_id
  )
  values (
    auth.uid(), trim(p_first_name), trim(p_last_name), v_email, now(),
    case when p_privacy_consent then now() else null end,
    case when p_privacy_consent then 'draft-2026-08-29' else null end,
    v_master_profile_id
  )
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        last_login = now(),
        privacy_consent_given_at = coalesce(public.participants.privacy_consent_given_at, excluded.privacy_consent_given_at),
        privacy_consent_version = coalesce(public.participants.privacy_consent_version, excluded.privacy_consent_version)
  returning * into v_row;

  return v_row;
end;
$$;
