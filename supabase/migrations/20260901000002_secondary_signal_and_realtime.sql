-- Adds a mechanically-derived secondary signal to the recommendation
-- engine, and enables Supabase Realtime for the tables the facilitator
-- control panel needs to live-update on (brief section 13).
--
-- secondary_signal_leverage_level is NOT the same thing as the
-- content-dependent secondary_result column (which stays empty until
-- Yutori supplies real recommendation copy, per
-- docs/CLIENT_QUESTIONS.md item 11). It's a direct, mechanical reading of
-- the brief's own worked example (section 8.1: "Orchestration,
-- Orchestration, Strategic -> Primary = Orchestration" clearly implies
-- Strategic is the secondary observation) -- in a 2-1 split, the minority
-- level; in a 3-0 split or a 1/1/1 tie, there is no secondary signal to
-- report, and this stays null rather than guessing one.

alter table public.architecture_recommendations
  add column secondary_signal_leverage_level text
    check (secondary_signal_leverage_level in ('execution', 'orchestration', 'strategic', 'systems'));

comment on column public.architecture_recommendations.secondary_signal_leverage_level is
  'The minority leverage level in a 2-1 split among the three Priority '
  'Delegation Opportunities. Null for a 3-0 split (nothing left over) or a '
  '1/1/1 tie (no secondary reading is more valid than any other). Distinct '
  'from secondary_result, which stays content-dependent and empty.';

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
  v_secondary_level text;
  v_max_count integer;
  v_distinct_levels integer;
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

  select count(*) into v_distinct_levels from jsonb_each_text(v_leverage_counts);

  select max(cnt) into v_max_count
  from (select (value)::integer as cnt from jsonb_each_text(v_leverage_counts)) c;

  v_is_tied := v_max_count < 2;

  if not v_is_tied then
    select key into v_primary_level
    from jsonb_each_text(v_leverage_counts)
    where value::integer = v_max_count
    limit 1;

    -- Secondary signal only exists for a genuine 2-1 split (three distinct
    -- levels with one appearing twice would be impossible with only 3
    -- items; the real cases are 3-0, no minority left over, or 2-1, exactly
    -- one minority level).
    if v_distinct_levels = 2 then
      select key into v_secondary_level
      from jsonb_each_text(v_leverage_counts)
      where key <> v_primary_level
      limit 1;
    end if;
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
    participant_session_id, primary_signal_leverage_level, secondary_signal_leverage_level, is_tied,
    primary_result, primary_role, secondary_result, rationale,
    supporting_signals, rules_version
  )
  values (
    p_participant_session_id, v_primary_level, v_secondary_level, v_is_tied,
    v_rule.primary_result, v_rule.primary_role, v_rule.secondary_result, v_rationale,
    coalesce(v_signals, '[]'::jsonb), coalesce(v_rule.version, 0)
  )
  on conflict (participant_session_id) do update
    set primary_signal_leverage_level = excluded.primary_signal_leverage_level,
        secondary_signal_leverage_level = excluded.secondary_signal_leverage_level,
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
-- Realtime: the facilitator control panel subscribes to these so the
-- participant roster updates live instead of only on manual refresh.
-- Realtime still respects RLS on each table (an admin's subscription sees
-- everything via is_admin(), a participant's would only ever see their own
-- rows) -- this does not widen who can read what, only when they find out.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.participant_sessions;
alter publication supabase_realtime add table public.participant_module_progress;
