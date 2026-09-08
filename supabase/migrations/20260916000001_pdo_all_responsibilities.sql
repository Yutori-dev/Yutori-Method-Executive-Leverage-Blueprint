-- Client request 2026-09-08 (live workshop feedback): Priority Delegation
-- Opportunities should offer all 21 responsibilities to choose from, not
-- just the ones that landed in Zone of Ambiguity/Vulnerability. Reverses
-- the zone-restricted eligibility from 20260906000003 -- eligibility is now
-- simply "a real, active, non-placeholder responsibility record" rather
-- than something the participant rated outside their Zone of Investment.
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
  from public.responsibilities
  where active = true and is_placeholder = false;

  v_required_count := least(3, v_eligible_count);

  select array_agg(distinct id) into v_distinct_ids from unnest(p_responsibility_ids) as id;
  v_count := coalesce(array_length(v_distinct_ids, 1), 0);

  if v_count <> v_required_count then
    raise exception 'Select exactly % priority delegation opportunit%(got %).',
      v_required_count, (case when v_required_count = 1 then 'y ' else 'ies ' end), v_count;
  end if;

  if v_count > 0 then
    select count(*) into v_eligible_count
    from public.responsibilities
    where id = any (v_distinct_ids) and active = true and is_placeholder = false;

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
