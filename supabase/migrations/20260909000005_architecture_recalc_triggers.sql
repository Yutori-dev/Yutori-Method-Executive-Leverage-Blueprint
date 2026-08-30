-- Extends the needs_recalculation flag (client V1 architecture spec,
-- section 21: "regenerate a recommendation after an input changes") to the
-- two other inputs the new engine reads besides intake: re-selecting
-- Priority Delegation Opportunities and recalculating the Executive
-- Support Audit. admin_update_participant_intake / save_participant_intake
-- already set this flag (20260906000004 / 20260907000001) -- same
-- principle, applied to the two remaining upstream inputs. Both functions
-- keep their existing signatures, so a plain create or replace is safe
-- (no overload trap).

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

  update public.architecture_recommendations
  set needs_recalculation = true
  where participant_session_id = p_participant_session_id;

  return query
    select * from public.priority_delegation_opportunities
    where participant_session_id = p_participant_session_id
    order by selection_order asc;
end;
$$;

create or replace function public.calculate_executive_support_audit_results(p_participant_session_id uuid)
returns public.executive_support_audit_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config_id uuid;
  v_total_questions integer;
  v_answered_count integer;
  v_execution integer;
  v_orchestration integer;
  v_strategic integer;
  v_systems integer;
  v_max_score integer;
  v_primary text[] := '{}';
  v_secondary text[] := '{}';
  v_second_max integer;
  v_threshold integer;
  v_row public.executive_support_audit_results;
begin
  if not exists (
    select 1 from public.participant_sessions
    where id = p_participant_session_id and participant_id = auth.uid()
  ) then
    raise exception 'Not authorized for this participant session.';
  end if;

  select id, secondary_threshold into v_config_id, v_threshold
  from public.executive_support_audit_config where active = true order by version desc limit 1;

  select count(*) into v_total_questions
  from public.executive_support_audit_questions where config_id = v_config_id and active = true;

  select count(*) into v_answered_count
  from public.executive_support_audit_responses r
  join public.executive_support_audit_questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id and q.config_id = v_config_id and q.active = true;

  if v_answered_count < v_total_questions then
    raise exception 'All questions must be answered before scoring (% of %).', v_answered_count, v_total_questions;
  end if;

  select count(*) filter (where selected_layer = 'execution'),
         count(*) filter (where selected_layer = 'orchestration'),
         count(*) filter (where selected_layer = 'strategic'),
         count(*) filter (where selected_layer = 'systems')
  into v_execution, v_orchestration, v_strategic, v_systems
  from public.executive_support_audit_responses
  where participant_session_id = p_participant_session_id;

  v_max_score := greatest(v_execution, v_orchestration, v_strategic, v_systems);

  if v_execution = v_max_score then v_primary := array_append(v_primary, 'execution'); end if;
  if v_orchestration = v_max_score then v_primary := array_append(v_primary, 'orchestration'); end if;
  if v_strategic = v_max_score then v_primary := array_append(v_primary, 'strategic'); end if;
  if v_systems = v_max_score then v_primary := array_append(v_primary, 'systems'); end if;

  if array_length(v_primary, 1) = 1 then
    v_second_max := 0;
    if v_primary[1] != 'execution' and v_execution > v_second_max then v_second_max := v_execution; end if;
    if v_primary[1] != 'orchestration' and v_orchestration > v_second_max then v_second_max := v_orchestration; end if;
    if v_primary[1] != 'strategic' and v_strategic > v_second_max then v_second_max := v_strategic; end if;
    if v_primary[1] != 'systems' and v_systems > v_second_max then v_second_max := v_systems; end if;

    if v_second_max >= v_threshold then
      if v_primary[1] != 'execution' and v_execution = v_second_max then v_secondary := array_append(v_secondary, 'execution'); end if;
      if v_primary[1] != 'orchestration' and v_orchestration = v_second_max then v_secondary := array_append(v_secondary, 'orchestration'); end if;
      if v_primary[1] != 'strategic' and v_strategic = v_second_max then v_secondary := array_append(v_secondary, 'strategic'); end if;
      if v_primary[1] != 'systems' and v_systems = v_second_max then v_secondary := array_append(v_secondary, 'systems'); end if;
    end if;
  end if;

  insert into public.executive_support_audit_results (
    participant_session_id, config_id, execution_score, orchestration_score, strategic_score, systems_score,
    primary_layers, secondary_layers, calculated_at
  )
  values (
    p_participant_session_id, v_config_id, v_execution, v_orchestration, v_strategic, v_systems,
    v_primary, v_secondary, now()
  )
  on conflict (participant_session_id) do update
    set config_id = excluded.config_id,
        execution_score = excluded.execution_score,
        orchestration_score = excluded.orchestration_score,
        strategic_score = excluded.strategic_score,
        systems_score = excluded.systems_score,
        primary_layers = excluded.primary_layers,
        secondary_layers = excluded.secondary_layers,
        calculated_at = excluded.calculated_at
  returning * into v_row;

  update public.architecture_recommendations
  set needs_recalculation = true
  where participant_session_id = p_participant_session_id;

  return v_row;
end;
$$;
