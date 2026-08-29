-- calculate_executive_leverage_diagnostic: scores the Executive Leverage
-- Diagnostic (Developer Implementation Specification V1). Modeled directly
-- on calculate_delegation_readiness() -- same ownership re-derivation,
-- same "latest active assessment version" lookup, same upsert-into-
-- assessment_results shape -- but this content is fully specified (not
-- pending), so it computes a real profile immediately rather than falling
-- back to placeholder copy.

create or replace function public.calculate_executive_leverage_diagnostic(
  p_participant_session_id uuid
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
  v_required_count integer;
  v_answered_count integer;
  v_dimension_scores jsonb := '{}'::jsonb;
  v_strongest_constraints jsonb;
  v_total_points numeric := 0;
  v_max_points numeric := 0;
  v_percentage numeric;
  v_result_label text;
  v_interpretation text;
  v_min_response_at timestamptz;
  v_existing_started_at timestamptz;
  v_started_at timestamptz;
  v_row public.assessment_results;
  rec record;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  if not public.is_module_unlocked_for_session(v_session_id, 'operating_altitude') then
    raise exception 'The Operating Altitude module is not yet unlocked.';
  end if;

  select id, version into v_assessment_id, v_assessment_version
  from public.assessments
  where key = 'executive_leverage_diagnostic' and active = true
  order by version desc
  limit 1;

  if v_assessment_id is null then
    raise exception 'Executive Leverage Diagnostic is not configured.';
  end if;

  -- Server-side enforcement: every required question must be answered
  -- before a result can be calculated (not just a disabled button).
  select count(*) into v_required_count
  from public.questions
  where assessment_id = v_assessment_id and required = true and active = true;

  select count(*) into v_answered_count
  from public.responses r
  join public.questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id
    and q.assessment_id = v_assessment_id
    and q.required = true
    and q.active = true
    and r.answer is not null;

  if v_answered_count < v_required_count then
    raise exception 'All required questions must be answered before scoring (% of % answered).',
      v_answered_count, v_required_count;
  end if;

  -- Score every scored question, keyed by its constraint label. Same
  -- answer_options join pattern calculate_delegation_readiness() uses for
  -- multiple_choice; max_score is read per-question rather than assumed,
  -- so the 52-point denominator stays correct even if a future admin edit
  -- changes a question's scoring values.
  for rec in
    select
      q.constraint_label,
      (
        select ao.score_value from public.answer_options ao
        where ao.question_id = q.id and ao.value = (r.answer #>> '{}')
        limit 1
      ) as score,
      (
        select max(ao.score_value) from public.answer_options ao
        where ao.question_id = q.id
      ) as max_score
    from public.questions q
    join public.responses r
      on r.question_id = q.id and r.participant_session_id = p_participant_session_id
    where q.assessment_id = v_assessment_id
      and q.scored = true
      and q.active = true
  loop
    v_dimension_scores := v_dimension_scores || jsonb_build_object(rec.constraint_label, rec.score);
    v_total_points := v_total_points + coalesce(rec.score, 0);
    v_max_points := v_max_points + coalesce(rec.max_score, 0);
  end loop;

  v_percentage := case when v_max_points > 0 then round((v_total_points / v_max_points) * 100, 2) else 0 end;

  select result_label, interpretation into v_result_label, v_interpretation
  from public.assessment_scoring_rules
  where assessment_id = v_assessment_id
    and active = true
    and v_percentage >= min_score
    and v_percentage <= max_score
  order by sort_order asc
  limit 1;

  -- Three lowest-scoring questions, ties broken by each question's fixed
  -- tie_break_priority -- a single "score asc, priority asc" ordering
  -- correctly implements "lowest three, ties broken by the fixed list"
  -- regardless of how many questions are actually tied at the boundary.
  -- Snapshots label+copy (not a live re-join) so a later admin content
  -- edit can't retroactively rewrite an already-displayed result.
  select coalesce(jsonb_agg(jsonb_build_object('label', t.constraint_label, 'interpretation', t.interpretation_copy)), '[]'::jsonb)
  into v_strongest_constraints
  from (
    select q.constraint_label, q.interpretation_copy
    from public.questions q
    join public.responses r
      on r.question_id = q.id and r.participant_session_id = p_participant_session_id
    where q.assessment_id = v_assessment_id
      and q.scored = true
      and q.active = true
    order by
      (
        select ao.score_value from public.answer_options ao
        where ao.question_id = q.id and ao.value = (r.answer #>> '{}')
        limit 1
      ) asc,
      q.tie_break_priority asc
    limit 3
  ) t;

  select min(r.created_at) into v_min_response_at
  from public.responses r
  join public.questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id and q.assessment_id = v_assessment_id;

  select started_at into v_existing_started_at
  from public.assessment_results
  where participant_session_id = p_participant_session_id and assessment_id = v_assessment_id;

  v_started_at := coalesce(v_existing_started_at, v_min_response_at);

  insert into public.assessment_results (
    participant_session_id, assessment_id, dimension_scores, overall_result, interpretation,
    rules_version, total_points, internal_percentage, strongest_constraints, started_at
  )
  values (
    p_participant_session_id, v_assessment_id, v_dimension_scores, v_result_label, v_interpretation,
    v_assessment_version, round(v_total_points)::integer, v_percentage, v_strongest_constraints, v_started_at
  )
  on conflict (participant_session_id, assessment_id) do update
    set dimension_scores = excluded.dimension_scores,
        overall_result = excluded.overall_result,
        interpretation = excluded.interpretation,
        rules_version = excluded.rules_version,
        total_points = excluded.total_points,
        internal_percentage = excluded.internal_percentage,
        strongest_constraints = excluded.strongest_constraints,
        started_at = coalesce(public.assessment_results.started_at, excluded.started_at),
        calculated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;
