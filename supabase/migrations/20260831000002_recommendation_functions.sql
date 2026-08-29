-- calculate_architecture_recommendation, admin_reveal_architecture, and
-- submit_architecture_reaction follow the same SECURITY DEFINER pattern as
-- Milestone 2's functions: derived values are computed here, never trusted
-- from a client-submitted parameter, and every function re-checks ownership
-- and module-unlock state itself.

create or replace function public.calculate_architecture_recommendation(
  p_participant_session_id uuid
)
returns public.architecture_recommendations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_already_revealed boolean;
  v_signals jsonb;
  v_leverage_counts jsonb;
  v_primary_level text;
  v_max_count integer;
  v_is_tied boolean;
  v_rule public.recommendation_rules;
  v_rationale text;
  v_row public.architecture_recommendations;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  if not public.is_module_unlocked_for_session(v_session_id, 'architecture') then
    raise exception 'The Architecture module is not yet unlocked.';
  end if;

  select coalesce((select s.architecture_revealed from public.sessions s where s.id = v_session_id), false)
    into v_already_revealed;

  if v_already_revealed and exists (
    select 1 from public.architecture_recommendations
    where participant_session_id = p_participant_session_id
  ) then
    raise exception 'This architecture has already been revealed and cannot be recalculated.';
  end if;

  if (
    select count(*) from public.priority_delegation_opportunities
    where participant_session_id = p_participant_session_id
  ) <> 3 then
    raise exception 'Complete Priority Delegation Opportunities first.';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'selectionOrder', pdo.selection_order,
      'responsibilityLabel', r.label,
      'leverageLevelSnapshot', pdo.leverage_level_snapshot
    )
    order by pdo.selection_order
  )
  into v_signals
  from public.priority_delegation_opportunities pdo
  join public.responsibilities r on r.id = pdo.responsibility_id
  where pdo.participant_session_id = p_participant_session_id;

  select jsonb_object_agg(leverage_level_snapshot, cnt) into v_leverage_counts
  from (
    select leverage_level_snapshot, count(*) as cnt
    from public.priority_delegation_opportunities
    where participant_session_id = p_participant_session_id
    group by leverage_level_snapshot
  ) counts;

  select max(cnt) into v_max_count
  from (select (value)::integer as cnt from jsonb_each_text(v_leverage_counts)) c;

  v_is_tied := v_max_count < 2;

  if not v_is_tied then
    select key into v_primary_level
    from jsonb_each_text(v_leverage_counts)
    where value::integer = v_max_count
    limit 1;
  end if;

  if not v_is_tied then
    select * into v_rule
    from public.recommendation_rules
    where active = true
      and condition ->> 'primary_signal_leverage_level' = v_primary_level
    order by priority asc
    limit 1;
  end if;

  if v_rule.id is null then
    v_rationale := 'Your results indicate a mixed leverage profile that requires additional interpretation.';
  else
    v_rationale := coalesce(v_rule.explanation_template, v_rationale);
  end if;

  insert into public.architecture_recommendations (
    participant_session_id, primary_signal_leverage_level, is_tied,
    primary_result, primary_role, secondary_result, rationale,
    supporting_signals, rules_version
  )
  values (
    p_participant_session_id, v_primary_level, v_is_tied,
    v_rule.primary_result, v_rule.primary_role, v_rule.secondary_result, v_rationale,
    coalesce(v_signals, '[]'::jsonb), coalesce(v_rule.version, 0)
  )
  on conflict (participant_session_id) do update
    set primary_signal_leverage_level = excluded.primary_signal_leverage_level,
        is_tied = excluded.is_tied,
        primary_result = excluded.primary_result,
        primary_role = excluded.primary_role,
        secondary_result = excluded.secondary_result,
        rationale = excluded.rationale,
        supporting_signals = excluded.supporting_signals,
        rules_version = excluded.rules_version,
        calculated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- has_calculated_architecture: lets a participant's own UI know whether
-- they're in the "ready, awaiting facilitator reveal" state without
-- exposing the recommendation content itself before architecture_revealed
-- is true (RLS on architecture_recommendations blocks reading the row
-- directly pre-reveal -- see the RLS migration).
-- ---------------------------------------------------------------------------
create or replace function public.has_calculated_architecture(p_participant_session_id uuid)
returns boolean
language plpgsql
stable
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

  return exists (
    select 1 from public.architecture_recommendations
    where participant_session_id = p_participant_session_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_reveal_architecture: cohort-wide, same shape as
-- admin_unlock_next_module. There is deliberately no per-participant reveal.
-- ---------------------------------------------------------------------------
create or replace function public.admin_reveal_architecture(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reveal architecture.';
  end if;

  update public.sessions
  set architecture_revealed = true
  where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_architecture_reaction: only valid once the participant's session
-- has architecture_revealed = true and their own recommendation exists.
-- ---------------------------------------------------------------------------
create or replace function public.submit_architecture_reaction(
  p_participant_session_id uuid,
  p_reaction text,
  p_note text
)
returns public.architecture_recommendations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_revealed boolean;
  v_row public.architecture_recommendations;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  if p_reaction not in ('yes', 'mostly', 'not_yet') then
    raise exception 'Invalid reaction value.';
  end if;

  select architecture_revealed into v_revealed from public.sessions where id = v_session_id;

  if not coalesce(v_revealed, false) then
    raise exception 'Architecture has not been revealed for this session yet.';
  end if;

  update public.architecture_recommendations
  set reaction = p_reaction,
      reaction_note = p_note,
      reaction_submitted_at = now()
  where participant_session_id = p_participant_session_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'No calculated architecture found for this participant session.';
  end if;

  return v_row;
end;
$$;
