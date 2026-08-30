-- Executive Support Architecture Recommendation Engine (client V1 spec,
-- 2026-08-30) -- wholesale replacement of calculate_architecture_recommendation.
-- The old engine computed a bare majority/tie signal against
-- recommendation_rules, a table that has never been seeded and has no
-- admin editor -- every real participant hit its null-guard "pending"
-- rationale. This spec is a complete, fully-specified deterministic engine
-- (primary/multi-layer/secondary logic, audit corroboration, current-support
-- classification, absorption rules, per-layer next-move copy), so the logic
-- itself is hardcoded here (matching calculate_executive_support_audit_results'
-- proven pattern) rather than re-seeding the dead rules table.
--
-- Still content-blocked on the same unresolved dependency as everything
-- downstream of responsibilities.leverage_level (docs/CLIENT_QUESTIONS.md
-- item 6): any confirmed Priority Delegation Opportunity with a null
-- leverage_level_snapshot short-circuits this function to a controlled
-- 'pending' result, same principle as the old null-guard.

alter table public.architecture_recommendations
  drop column primary_signal_leverage_level,
  drop column is_tied,
  drop column primary_result,
  drop column primary_role,
  drop column secondary_result,
  drop column secondary_signal_leverage_level,
  drop column rationale,
  drop column supporting_signals,
  drop column rules_version,
  add column primary_signal_type text not null default 'pending'
    check (primary_signal_type in ('primary', 'multi_layer', 'audit_only', 'pending')),
  add column primary_leverage_need text
    check (primary_leverage_need in ('execution', 'orchestration', 'strategic', 'systems')),
  add column leading_leverage_need text
    check (leading_leverage_need in ('execution', 'orchestration', 'strategic', 'systems')),
  add column multi_layer_levels text[] not null default '{}',
  add column audit_corroboration text check (audit_corroboration in ('strong', 'secondary', 'none')),
  add column secondary_leverage_needs text[] not null default '{}',
  add column recommended_primary_architecture text,
  add column recommended_secondary_architectures text[] not null default '{}',
  add column primary_recommended_action text,
  add column secondary_recommended_actions text[] not null default '{}',
  add column current_support_match_state text[] not null default '{}',
  add column systems_amplifier_flag boolean not null default false,
  add column architecture_logic_version integer not null default 2;

alter table public.architecture_recommendations alter column primary_signal_type drop default;

-- Pure lookup, no table access -- the same 4-way branch is needed once for
-- the primary/leading/audit-only-starting-point level and once per
-- surviving secondary candidate, so it's factored out rather than repeated.
-- Two of the spec's "ADD_STRATEGIC" cases carry different participant-facing
-- copy (Orchestration-support-present vs. no classified support) despite
-- sharing one action name in the spec's prose -- split into two internal
-- codes so the config table can hold both copy blocks distinctly.
create or replace function public.executive_support_architecture_next_move(
  p_level text,
  p_has_execution boolean,
  p_has_orchestration boolean,
  p_has_strategic boolean,
  p_has_systems boolean
)
returns text
language plpgsql
immutable
as $$
begin
  if p_level = 'execution' then
    return case when p_has_execution then 'strengthen_execution' else 'add_execution' end;
  elsif p_level = 'orchestration' then
    if p_has_orchestration then return 'strengthen_orchestration';
    elsif p_has_execution then return 'evolve_or_add_orchestration';
    else return 'add_orchestration';
    end if;
  elsif p_level = 'strategic' then
    if p_has_strategic then return 'strengthen_strategic';
    elsif p_has_orchestration then return 'add_strategic_from_orchestration';
    else return 'add_strategic';
    end if;
  elsif p_level = 'systems' then
    return case when p_has_systems then 'strengthen_systems' else 'add_systems' end;
  end if;
  return null;
end;
$$;

create or replace function public.calculate_executive_support_architecture(
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

  v_plo_levels text[] := '{}';
  v_plo_count integer;
  v_has_pending_snapshot boolean;

  v_exec_count integer := 0;
  v_orch_count integer := 0;
  v_strat_count integer := 0;
  v_sys_count integer := 0;
  v_max_count integer;
  v_distinct_levels text[];

  v_signal_type text;
  v_primary_level text;
  v_leading_level text;
  v_multi_layer_levels text[] := '{}';

  v_audit_primary text[] := '{}';
  v_audit_secondary text[] := '{}';
  v_leading_candidates text[];

  v_corroboration text;
  v_secondary_candidates text[] := '{}';
  v_secondary_survivors text[] := '{}';

  v_has_execution_support boolean;
  v_has_orchestration_support boolean;
  v_has_strategic_support boolean;
  v_has_systems_support boolean;
  v_current_support_match text[] := '{}';

  v_target_level text;
  v_primary_action text;
  v_secondary_actions text[] := '{}';
  v_systems_amplifier boolean := false;

  v_row public.architecture_recommendations;
begin
  select ps.session_id into v_session_id
  from public.participant_sessions ps
  where ps.id = p_participant_session_id and ps.participant_id = auth.uid();

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

  select array_agg(leverage_level_snapshot order by selection_order),
         count(*),
         bool_or(leverage_level_snapshot is null)
    into v_plo_levels, v_plo_count, v_has_pending_snapshot
  from public.priority_delegation_opportunities
  where participant_session_id = p_participant_session_id;

  v_plo_count := coalesce(v_plo_count, 0);

  select primary_layers, secondary_layers into v_audit_primary, v_audit_secondary
  from public.executive_support_audit_results
  where participant_session_id = p_participant_session_id;
  v_audit_primary := coalesce(v_audit_primary, '{}');
  v_audit_secondary := coalesce(v_audit_secondary, '{}');

  -- Content-gap fallback: a confirmed PDO exists but its hidden leverage
  -- classification hasn't been supplied yet (responsibilities.leverage_level
  -- is currently null for every real responsibility -- see migration comment).
  if v_plo_count > 0 and v_has_pending_snapshot then
    v_signal_type := 'pending';
  else
    -- Section 3: Primary / Multi-Layer determination.
    if v_plo_count = 0 then
      v_signal_type := 'audit_only';
      if array_length(v_audit_primary, 1) = 1 then
        v_primary_level := v_audit_primary[1];
      elsif array_length(v_audit_primary, 1) > 1 then
        v_multi_layer_levels := v_audit_primary;
      end if;
    else
      select count(*) filter (where l = 'execution'),
             count(*) filter (where l = 'orchestration'),
             count(*) filter (where l = 'strategic'),
             count(*) filter (where l = 'systems')
        into v_exec_count, v_orch_count, v_strat_count, v_sys_count
      from unnest(v_plo_levels) as l;

      v_max_count := greatest(v_exec_count, v_orch_count, v_strat_count, v_sys_count);
      select array_agg(distinct l) into v_distinct_levels from unnest(v_plo_levels) as l;

      if v_plo_count = 1 then
        v_signal_type := 'primary';
        v_primary_level := v_plo_levels[1];
      elsif v_max_count >= 2 then
        -- 3-of-3 majority, or a 2-1 split (2 counts as a majority for a 2-PLO
        -- pair too: both-same-level).
        v_signal_type := 'primary';
        if v_exec_count = v_max_count then v_primary_level := 'execution';
        elsif v_orch_count = v_max_count then v_primary_level := 'orchestration';
        elsif v_strat_count = v_max_count then v_primary_level := 'strategic';
        else v_primary_level := 'systems';
        end if;
      else
        -- Every represented level appears exactly once: a 3-way or 2-way
        -- split with no repeats.
        v_signal_type := 'multi_layer';
        v_multi_layer_levels := v_distinct_levels;
      end if;
    end if;

    -- Section 4: Multi-Layer audit tie-break (only for a genuine PLO-derived
    -- multi-layer result -- the zero-PLO tied-audit case in section 3 has no
    -- PLO levels to cross-reference against, so it never gets a leading need).
    if v_signal_type = 'multi_layer' then
      select array_agg(l) into v_leading_candidates
      from unnest(v_audit_primary) as l
      where l = any(v_multi_layer_levels);

      if array_length(v_leading_candidates, 1) = 1 then
        v_leading_level := v_leading_candidates[1];
      end if;
    end if;

    -- Section 5: Audit corroboration -- only when a PLO-derived Primary
    -- Leverage Need exists.
    if v_signal_type = 'primary' then
      if v_primary_level = any(v_audit_primary) then
        v_corroboration := 'strong';
      elsif v_primary_level = any(v_audit_secondary) then
        v_corroboration := 'secondary';
      else
        v_corroboration := 'none';
      end if;
    end if;

    -- Sections 6-7: Secondary Leverage Need + Architecture Absorption Rules
    -- -- only for the genuine single-Primary case (spec section 14 lists
    -- this as part of the Standard Primary Result only).
    if v_signal_type = 'primary' then
      select array_agg(l) into v_secondary_candidates
      from unnest(v_audit_primary) as l
      where l <> v_primary_level;

      if v_secondary_candidates is null or array_length(v_secondary_candidates, 1) = 0 then
        select array_agg(l) into v_secondary_candidates
        from unnest(v_audit_secondary) as l
        where l <> v_primary_level;
      end if;
      v_secondary_candidates := coalesce(v_secondary_candidates, '{}');

      select array_agg(c) into v_secondary_survivors
      from unnest(v_secondary_candidates) as c
      where not (v_primary_level = 'orchestration' and c = 'execution');
      v_secondary_survivors := coalesce(v_secondary_survivors, '{}');
    end if;
  end if;

  -- Section 9: Current-support classification (own current, unconditional
  -- read -- module-unlock only gates the calculation itself, not this
  -- already-collected intake data).
  select
    coalesce(p.current_support_personal_assistant, false) or coalesce(p.current_support_admin_or_va, false),
    coalesce(p.current_support_executive_assistant, false) or coalesce(p.current_support_senior_executive_assistant, false),
    coalesce(p.current_support_head_of_operations, false) or coalesce(p.current_support_chief_of_staff, false)
      or coalesce(p.current_support_chief_integrator, false) or coalesce(p.current_support_coo, false),
    coalesce(p.current_support_ai_automation, false)
  into v_has_execution_support, v_has_orchestration_support, v_has_strategic_support, v_has_systems_support
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  where ps.id = p_participant_session_id;

  if v_has_execution_support then v_current_support_match := array_append(v_current_support_match, 'execution'); end if;
  if v_has_orchestration_support then v_current_support_match := array_append(v_current_support_match, 'orchestration'); end if;
  if v_has_strategic_support then v_current_support_match := array_append(v_current_support_match, 'strategic'); end if;
  if v_has_systems_support then v_current_support_match := array_append(v_current_support_match, 'systems'); end if;

  -- Section 10: Recommended Next Move -- applied to whichever single level
  -- is this result's headline target (Primary, Leading, or the Audit-Only
  -- single-gap starting point all drive identical downstream logic per the
  -- spec's own text), then to each surviving Secondary candidate.
  v_target_level := coalesce(v_primary_level, v_leading_level);
  if v_target_level is not null then
    v_primary_action := public.executive_support_architecture_next_move(
      v_target_level, v_has_execution_support, v_has_orchestration_support, v_has_strategic_support, v_has_systems_support
    );
  end if;

  if array_length(v_secondary_survivors, 1) > 0 then
    select array_agg(
      public.executive_support_architecture_next_move(
        c, v_has_execution_support, v_has_orchestration_support, v_has_strategic_support, v_has_systems_support
      )
    ) into v_secondary_actions
    from unnest(v_secondary_survivors) as c;
    v_systems_amplifier := 'systems' = any(v_secondary_survivors);
  end if;

  insert into public.architecture_recommendations (
    participant_session_id, primary_signal_type, primary_leverage_need, leading_leverage_need,
    multi_layer_levels, audit_corroboration, secondary_leverage_needs,
    recommended_primary_architecture, recommended_secondary_architectures,
    primary_recommended_action, secondary_recommended_actions,
    current_support_match_state, systems_amplifier_flag, architecture_logic_version, calculated_at
  )
  values (
    p_participant_session_id, v_signal_type, v_primary_level, v_leading_level,
    v_multi_layer_levels, v_corroboration, v_secondary_survivors,
    v_target_level, v_secondary_survivors,
    v_primary_action, coalesce(v_secondary_actions, '{}'),
    v_current_support_match, v_systems_amplifier, 2, now()
  )
  on conflict (participant_session_id) do update
    set primary_signal_type = excluded.primary_signal_type,
        primary_leverage_need = excluded.primary_leverage_need,
        leading_leverage_need = excluded.leading_leverage_need,
        multi_layer_levels = excluded.multi_layer_levels,
        audit_corroboration = excluded.audit_corroboration,
        secondary_leverage_needs = excluded.secondary_leverage_needs,
        recommended_primary_architecture = excluded.recommended_primary_architecture,
        recommended_secondary_architectures = excluded.recommended_secondary_architectures,
        primary_recommended_action = excluded.primary_recommended_action,
        secondary_recommended_actions = excluded.secondary_recommended_actions,
        current_support_match_state = excluded.current_support_match_state,
        systems_amplifier_flag = excluded.systems_amplifier_flag,
        architecture_logic_version = excluded.architecture_logic_version,
        calculated_at = excluded.calculated_at,
        needs_recalculation = false
  returning * into v_row;

  return v_row;
end;
$$;
