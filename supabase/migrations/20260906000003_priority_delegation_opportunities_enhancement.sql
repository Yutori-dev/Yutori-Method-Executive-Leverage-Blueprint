-- Priority Delegation Opportunities enhancement (client V1 developer
-- spec): pressure test after selection, "revisit vs. keep" flow, and a
-- variable required-selection count (spec section 4: fewer than 3
-- eligible responsibilities lowers the required count to match; zero
-- eligible needs no selection at all).

create table public.priority_delegation_pressure_test (
  participant_session_id uuid primary key references public.participant_sessions (id) on delete cascade,
  response text not null check (response in ('yes', 'somewhat', 'no')),
  revisited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.priority_delegation_pressure_test enable row level security;

create policy "participants read own pressure test"
  on public.priority_delegation_pressure_test for select
  using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = priority_delegation_pressure_test.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy "admins read all pressure tests"
  on public.priority_delegation_pressure_test for select
  using (public.is_admin());

-- select_priority_delegation_opportunities: reworked to require exactly
-- min(3, eligible_count) selections instead of always exactly 3 (spec
-- section 4 -- fewer than 3 eligible responsibilities lowers the bar to
-- match, zero eligible requires none at all).
create or replace function public.select_priority_delegation_opportunities(
  p_participant_session_id uuid,
  p_responsibility_ids uuid[]
)
returns setof public.priority_delegation_opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_distinct_ids uuid[];
  v_count integer;
  v_eligible_count integer;
  v_required_count integer;
  v_id uuid;
  v_order integer := 0;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  if not public.is_module_unlocked_for_session(v_session_id, 'delegation') then
    raise exception 'The Delegation module is not yet unlocked.';
  end if;

  select count(*) into v_eligible_count
  from public.participant_responsibilities
  where participant_session_id = p_participant_session_id
    and macro_zone in ('ambiguity', 'vulnerability');

  v_required_count := least(3, v_eligible_count);

  select array_agg(distinct id) into v_distinct_ids from unnest(p_responsibility_ids) as id;
  v_count := coalesce(array_length(v_distinct_ids, 1), 0);

  if v_count <> v_required_count then
    raise exception 'Select exactly % priority delegation opportunit%(got %).',
      v_required_count, (case when v_required_count = 1 then 'y ' else 'ies ' end), v_count;
  end if;

  if v_count > 0 then
    select count(*) into v_eligible_count
    from public.participant_responsibilities
    where participant_session_id = p_participant_session_id
      and responsibility_id = any (v_distinct_ids)
      and macro_zone in ('ambiguity', 'vulnerability');

    if v_eligible_count <> v_count then
      raise exception 'One or more selections are not currently eligible delegation candidates.';
    end if;
  end if;

  delete from public.priority_delegation_opportunities
  where participant_session_id = p_participant_session_id;

  delete from public.priority_delegation_pressure_test
  where participant_session_id = p_participant_session_id;

  foreach v_id in array p_responsibility_ids
  loop
    v_order := v_order + 1;
    insert into public.priority_delegation_opportunities (
      participant_session_id, responsibility_id, selection_order, leverage_level_snapshot
    )
    select p_participant_session_id, v_id, v_order, r.leverage_level
    from public.responsibilities r
    where r.id = v_id;
  end loop;

  return query
    select * from public.priority_delegation_opportunities
    where participant_session_id = p_participant_session_id
    order by selection_order asc;
end;
$$;

-- save_pressure_test_response: own-session upsert.
create or replace function public.save_pressure_test_response(
  p_participant_session_id uuid,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.participant_sessions
    where id = p_participant_session_id and participant_id = auth.uid()
  ) then
    raise exception 'Not authorized for this participant session.';
  end if;

  if p_response not in ('yes', 'somewhat', 'no') then
    raise exception 'Invalid pressure test response.';
  end if;

  insert into public.priority_delegation_pressure_test (participant_session_id, response, updated_at)
  values (p_participant_session_id, p_response, now())
  on conflict (participant_session_id) do update
    set response = excluded.response, updated_at = now();
end;
$$;

-- mark_priority_delegation_revisited: sets the revisited flag (spec
-- section 11 asks this be stored) when the participant clicks
-- "REVISIT MY SELECTIONS" after a Somewhat/No pressure-test response.
create or replace function public.mark_priority_delegation_revisited(p_participant_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.participant_sessions
    where id = p_participant_session_id and participant_id = auth.uid()
  ) then
    raise exception 'Not authorized for this participant session.';
  end if;

  update public.priority_delegation_pressure_test
  set revisited = true, updated_at = now()
  where participant_session_id = p_participant_session_id;
end;
$$;
