-- All participant-facing mutations for Milestone 2 live here as
-- SECURITY DEFINER functions. Every one of them re-validates ownership and
-- module-unlock state itself -- they assume they can be called directly via
-- the PostgREST RPC endpoint by a participant who never went through the
-- Next.js UI at all, because they can (task instructions section 19/21).

create or replace function public.is_module_unlocked_for_session(p_session_id uuid, p_module_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_target_sort integer;
  v_active_sort integer;
begin
  select sort_order into v_target_sort from public.modules where key = p_module_key;

  select m.sort_order into v_active_sort
  from public.sessions s
  left join public.modules m on m.id = s.active_module_id
  where s.id = p_session_id;

  if v_target_sort is null or v_active_sort is null then
    return false;
  end if;

  return v_target_sort <= v_active_sort;
end;
$$;

-- ---------------------------------------------------------------------------
-- select_responsibilities: replaces the caller's full responsibility
-- selection for one participant_session. Ratings on responsibilities that
-- remain selected are preserved; responsibilities dropped from the new set
-- lose their rating row entirely (re-selecting later starts unrated).
-- ---------------------------------------------------------------------------
create or replace function public.select_responsibilities(
  p_participant_session_id uuid,
  p_responsibility_ids uuid[]
)
returns setof public.participant_responsibilities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_distinct_ids uuid[];
  v_count integer;
  v_valid_count integer;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  if not public.is_module_unlocked_for_session(v_session_id, 'current_structure') then
    raise exception 'The Current Structure module is not yet unlocked.';
  end if;

  select array_agg(distinct id) into v_distinct_ids from unnest(p_responsibility_ids) as id;
  v_count := coalesce(array_length(v_distinct_ids, 1), 0);

  if v_count < 10 or v_count > 12 then
    raise exception 'Select between 10 and 12 responsibilities (got %).', v_count;
  end if;

  select count(*) into v_valid_count
  from public.responsibilities
  where id = any(v_distinct_ids) and active = true;

  if v_valid_count <> v_count then
    raise exception 'One or more selected responsibilities are invalid.';
  end if;

  delete from public.participant_responsibilities
  where participant_session_id = p_participant_session_id
    and responsibility_id <> all (v_distinct_ids);

  insert into public.participant_responsibilities (participant_session_id, responsibility_id)
  select p_participant_session_id, rid
  from unnest(v_distinct_ids) as rid
  on conflict (participant_session_id, responsibility_id) do nothing;

  return query
    select * from public.participant_responsibilities
    where participant_session_id = p_participant_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- rate_responsibility: sets competency/passion for one already-selected
-- responsibility and derives matrix_cell/macro_zone from the active
-- zone_matrix_cells configuration. If no matching configuration row exists
-- yet (real content not supplied), matrix_cell/macro_zone are left null
-- rather than guessed.
-- ---------------------------------------------------------------------------
create or replace function public.rate_responsibility(
  p_participant_session_id uuid,
  p_responsibility_id uuid,
  p_competency text,
  p_passion text
)
returns public.participant_responsibilities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_cell text;
  v_zone text;
  v_row public.participant_responsibilities;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  if not public.is_module_unlocked_for_session(v_session_id, 'current_structure') then
    raise exception 'The Current Structure module is not yet unlocked.';
  end if;

  if p_competency not in ('low', 'medium', 'high') or p_passion not in ('low', 'medium', 'high') then
    raise exception 'Invalid competency/passion value.';
  end if;

  if not exists (
    select 1 from public.participant_responsibilities
    where participant_session_id = p_participant_session_id and responsibility_id = p_responsibility_id
  ) then
    raise exception 'That responsibility was not selected.';
  end if;

  select cell_name, macro_zone into v_cell, v_zone
  from public.zone_matrix_cells
  where competency_level = p_competency and passion_level = p_passion and active = true
  order by version desc
  limit 1;

  update public.participant_responsibilities
  set competency = p_competency,
      passion = p_passion,
      matrix_cell = v_cell,
      macro_zone = v_zone
  where participant_session_id = p_participant_session_id and responsibility_id = p_responsibility_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- select_priority_delegation_opportunities: replaces the caller's full set
-- of exactly 3 priority opportunities. Every id must currently be rated
-- outside Zone of Investment for this participant_session -- eligibility is
-- re-checked here, never trusted from the client.
-- ---------------------------------------------------------------------------
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

  select array_agg(distinct id) into v_distinct_ids from unnest(p_responsibility_ids) as id;
  v_count := coalesce(array_length(v_distinct_ids, 1), 0);

  if v_count <> 3 then
    raise exception 'Select exactly 3 priority delegation opportunities (got %).', v_count;
  end if;

  select count(*) into v_eligible_count
  from public.participant_responsibilities
  where participant_session_id = p_participant_session_id
    and responsibility_id = any (v_distinct_ids)
    and macro_zone in ('ambiguity', 'vulnerability');

  if v_eligible_count <> 3 then
    raise exception 'One or more selections are not currently eligible delegation candidates.';
  end if;

  delete from public.priority_delegation_opportunities
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

-- ---------------------------------------------------------------------------
-- calculate_delegation_readiness: aggregates raw responses to the given
-- assessment into per-dimension scores, then looks for a matching
-- assessment_scoring_rules row. assessment_scoring_rules is empty in every
-- environment until Yutori supplies real thresholds, so overall_result is
-- null and interpretation is a labeled fallback until then -- this function
-- does not invent a result (task instructions section 13/22).
-- ---------------------------------------------------------------------------
create or replace function public.calculate_delegation_readiness(
  p_participant_session_id uuid,
  p_assessment_key text
)
returns public.assessment_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_assessment_id uuid;
  v_assessment_version integer;
  v_dimension_scores jsonb := '{}'::jsonb;
  v_dim record;
  v_overall_result text := null;
  v_interpretation text;
  v_row public.assessment_results;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  select id, version into v_assessment_id, v_assessment_version
  from public.assessments
  where key = p_assessment_key and active = true
  order by version desc
  limit 1;

  if v_assessment_id is null then
    raise exception 'Assessment "%" is not configured.', p_assessment_key;
  end if;

  for v_dim in
    select
      coalesce(q.config ->> 'dimension', 'general') as dimension,
      sum(
        case
          when q.type in ('rating_scale', 'numeric') then (r.answer #>> '{}')::numeric
          when q.type = 'multiple_choice' then (
            select ao.score_value from public.answer_options ao
            where ao.question_id = q.id and ao.value = (r.answer #>> '{}')
            limit 1
          )
          when q.type = 'multi_select' then (
            select coalesce(sum(ao.score_value), 0) from public.answer_options ao
            where ao.question_id = q.id
              and ao.value in (select jsonb_array_elements_text(r.answer))
          )
          else null
        end
      ) as dimension_score
    from public.responses r
    join public.questions q on q.id = r.question_id
    where r.participant_session_id = p_participant_session_id
      and q.assessment_id = v_assessment_id
    group by coalesce(q.config ->> 'dimension', 'general')
  loop
    v_dimension_scores := v_dimension_scores || jsonb_build_object(v_dim.dimension, v_dim.dimension_score);
  end loop;

  select result_label, interpretation into v_overall_result, v_interpretation
  from public.assessment_scoring_rules
  where assessment_id = v_assessment_id and active = true
  order by sort_order asc
  limit 1;

  if v_overall_result is null then
    v_interpretation := '[YUTORI CONTENT PENDING] Your responses have been recorded. '
      'Your Delegation Readiness Profile will be calculated once Yutori''s final scoring model is configured.';
  end if;

  insert into public.assessment_results (
    participant_session_id, assessment_id, dimension_scores, overall_result, interpretation, rules_version
  )
  values (
    p_participant_session_id, v_assessment_id, v_dimension_scores, v_overall_result, v_interpretation, v_assessment_version
  )
  on conflict (participant_session_id, assessment_id) do update
    set dimension_scores = excluded.dimension_scores,
        overall_result = excluded.overall_result,
        interpretation = excluded.interpretation,
        rules_version = excluded.rules_version,
        calculated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;
