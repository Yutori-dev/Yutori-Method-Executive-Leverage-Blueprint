-- Zone of Investment rebuild: rate_responsibility becomes the only write
-- path (no more a separate select_responsibilities commit step -- rating a
-- responsibility IS the only action), enforces the 12-mapped ceiling, and
-- supports clearing a rating back to null. admin_reveal_zone_of_investment
-- mirrors admin_reveal_architecture exactly. calculate_architecture_
-- recommendation gets a null-guard so a priority opportunity built from one
-- of the new real (leverage_level = null) responsibilities produces a
-- controlled-pending result instead of crashing on jsonb_object_agg(null).

drop function if exists public.select_responsibilities(uuid, uuid[]);

-- ---------------------------------------------------------------------------
-- rate_responsibility: upserts competency/passion for one responsibility
-- (no prior "selection" required) and derives matrix_cell/macro_zone from
-- the active zone_matrix_cells configuration once both values are set.
-- Either value may be passed null to clear that dimension -- clearing
-- either one un-maps the responsibility (matrix_cell/macro_zone revert to
-- null too). A write that would newly push the mapped count above 12 is
-- rejected; a write that only edits an already-mapped responsibility, or
-- that doesn't yet complete a new mapping, is always allowed.
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
  v_was_mapped boolean;
  v_will_be_mapped boolean;
  v_currently_mapped_count integer;
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

  if p_competency is not null and p_competency not in ('low', 'medium', 'high') then
    raise exception 'Invalid competency value.';
  end if;

  if p_passion is not null and p_passion not in ('low', 'medium', 'high') then
    raise exception 'Invalid passion value.';
  end if;

  if not exists (select 1 from public.responsibilities where id = p_responsibility_id and active = true) then
    raise exception 'Invalid responsibility.';
  end if;

  select (competency is not null and passion is not null) into v_was_mapped
  from public.participant_responsibilities
  where participant_session_id = p_participant_session_id and responsibility_id = p_responsibility_id;

  v_was_mapped := coalesce(v_was_mapped, false);
  v_will_be_mapped := p_competency is not null and p_passion is not null;

  if v_will_be_mapped and not v_was_mapped then
    select count(*) into v_currently_mapped_count
    from public.participant_responsibilities
    where participant_session_id = p_participant_session_id
      and competency is not null and passion is not null;

    if v_currently_mapped_count >= 12 then
      raise exception 'You can map at most 12 responsibilities.';
    end if;
  end if;

  if v_will_be_mapped then
    select cell_name, macro_zone into v_cell, v_zone
    from public.zone_matrix_cells
    where competency_level = p_competency and passion_level = p_passion and active = true
    order by version desc
    limit 1;
  end if;

  insert into public.participant_responsibilities (
    participant_session_id, responsibility_id, competency, passion, matrix_cell, macro_zone
  )
  values (
    p_participant_session_id, p_responsibility_id, p_competency, p_passion, v_cell, v_zone
  )
  on conflict (participant_session_id, responsibility_id) do update
    set competency = excluded.competency,
        passion = excluded.passion,
        matrix_cell = excluded.matrix_cell,
        macro_zone = excluded.macro_zone
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_reveal_zone_of_investment: cohort-wide, one-way -- mirrors
-- admin_reveal_architecture exactly. matrix_cell/macro_zone are already
-- computed eagerly per-rating (unlike Architecture's single calculated
-- row), so this only needs to flip the presentation gate; nothing to
-- (re)compute here.
-- ---------------------------------------------------------------------------
create or replace function public.admin_reveal_zone_of_investment(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reveal Zone of Investment.';
  end if;

  update public.sessions
  set zone_of_investment_revealed = true
  where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- calculate_architecture_recommendation: add a null-snapshot guard. A
-- priority opportunity built from a responsibility whose leverage_level
-- hasn't been supplied yet snapshots a null leverage_level_snapshot
-- (20260903000001_zone_of_investment_schema.sql); jsonb_object_agg() raises
-- on a null key, so this is checked explicitly and produces the same
-- controlled-pending shape used elsewhere in this function (no rule
-- matched) rather than crashing or guessing a majority.
-- ---------------------------------------------------------------------------
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
  v_pending_count integer;
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

  select count(*) into v_pending_count
  from public.priority_delegation_opportunities
  where participant_session_id = p_participant_session_id and leverage_level_snapshot is null;

  if v_pending_count > 0 then
    v_is_tied := true;
    v_primary_level := null;
    v_secondary_level := null;
    v_rationale := 'Your responses have been recorded. One or more of your Priority Delegation '
      'Opportunities does not yet have its leverage classification configured, so your Executive '
      'Support Architecture recommendation is pending.';
  else
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
