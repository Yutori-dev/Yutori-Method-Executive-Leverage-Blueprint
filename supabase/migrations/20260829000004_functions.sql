-- RPCs that encode the small pieces of workflow logic Milestone 1 actually
-- owns (enrollment, cohort-wide unlock). Keeping these in the database
-- means the rule "no duplicate registration" and "unlock only moves
-- forward" hold no matter what client calls them.

-- ---------------------------------------------------------------------------
-- ensure_participant: idempotent upsert of the caller's own participant
-- profile. The email is read from auth.users rather than accepted as a
-- parameter, so a participant can't set it to something other than their
-- verified auth identity. That requires security definer, because the
-- `authenticated` role Supabase queries run as does not have select on
-- auth.users by default -- the function body still only ever touches the
-- row for auth.uid(), so this doesn't widen what a caller can affect.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_participant(
  p_first_name text,
  p_last_name text
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

  insert into public.participants (id, first_name, last_name, email, last_login)
  values (auth.uid(), trim(p_first_name), trim(p_last_name), v_email, now())
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        last_login = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_session: enroll the caller into a session identified by its join
-- code. security definer so a not-yet-enrolled participant can resolve the
-- join code (sessions RLS otherwise only lets enrolled participants/admins
-- read a session). Always inserts for auth.uid() -- never a caller-supplied
-- participant id -- so it cannot be used to enroll someone else.
-- ---------------------------------------------------------------------------
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

  if v_session.status = 'archived' then
    raise exception 'This session is no longer accepting participants.';
  end if;

  insert into public.participant_sessions (participant_id, session_id, started_at, last_active_at)
  values (auth.uid(), v_session.id, now(), now())
  on conflict (participant_id, session_id) do update
    set last_active_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_unlock_next_module: cohort-wide advance to the next active module in
-- sort_order. No-op (returns current session) if already at the last module.
-- ---------------------------------------------------------------------------
create or replace function public.admin_unlock_next_module(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_sort integer;
  v_next_module_id uuid;
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can unlock modules.';
  end if;

  select m.sort_order into v_current_sort
  from public.sessions s
  left join public.modules m on m.id = s.active_module_id
  where s.id = p_session_id;

  select id into v_next_module_id
  from public.modules
  where active = true
    and requires_live_workshop = false
    and (v_current_sort is null or sort_order > v_current_sort)
  order by sort_order asc
  limit 1;

  if v_next_module_id is null then
    select * into v_row from public.sessions where id = p_session_id;
    return v_row;
  end if;

  update public.sessions
  set active_module_id = v_next_module_id
  where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.admin_unlock_next_module(uuid) is
  'Cohort-wide only, per brief section 7/16 -- there is deliberately no '
  'per-participant advance function in Milestone 1.';
