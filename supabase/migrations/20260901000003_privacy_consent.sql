-- Extends ensure_participant() to optionally record privacy consent at the
-- same time the participant row is first created -- that's the point in
-- the flow where a participant row actually exists to attach it to (brief
-- section 26). p_privacy_consent defaults to false so this stays backward
-- compatible with any caller that doesn't pass it.
--
-- The consent copy itself is the brief's own draft language, which the
-- brief explicitly marks "REQUIRES YUTORI APPROVAL BEFORE PRODUCTION" --
-- recording that consent was given against a specific version string
-- (rather than just a boolean) means historical consent stays interpretable
-- even after the copy changes, same versioning discipline used everywhere
-- else in this schema.

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
  v_row public.participants;
begin
  select email into v_email from auth.users where id = auth.uid();

  if v_email is null then
    raise exception 'No authenticated user.';
  end if;

  insert into public.participants (
    id, first_name, last_name, email, last_login, privacy_consent_given_at, privacy_consent_version
  )
  values (
    auth.uid(), trim(p_first_name), trim(p_last_name), v_email, now(),
    case when p_privacy_consent then now() else null end,
    case when p_privacy_consent then 'draft-2026-08-29' else null end
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
