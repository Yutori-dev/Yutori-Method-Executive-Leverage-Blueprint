-- TEMPORARY (testing phase only): allow joining a session regardless of
-- its status (draft/active/archived), so anyone can sign up and test
-- against any session without an admin first flipping it to ACTIVE. Both
-- functions previously blocked 'archived' sessions specifically -- that
-- block is removed here. Restore the 'archived' check before production
-- (see docs/ARCHITECTURE_DECISIONS.md for the revert note).

create or replace function public.join_session(p_join_code text)
returns public.participant_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_row public.participant_sessions;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user.';
  end if;

  if not exists (select 1 from public.participants where id = auth.uid()) then
    raise exception 'Participant profile must exist before joining a session.';
  end if;

  select * into v_session
  from public.sessions
  where join_code = p_join_code
  limit 1;

  if v_session.id is null then
    raise exception 'Unknown join code.';
  end if;

  insert into public.participant_sessions (participant_id, session_id, started_at, last_active_at)
  values (auth.uid(), v_session.id, now(), now())
  on conflict (participant_id, session_id) do update
    set last_active_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.get_session_by_join_code(p_join_code text)
returns table (
  name text,
  organization text,
  event_date date,
  format text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.organization, s.event_date, s.format, s.status
  from public.sessions s
  where s.join_code = p_join_code;
$$;
