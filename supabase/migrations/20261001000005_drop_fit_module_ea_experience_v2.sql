-- Client feedback:
-- 1. "Fit (Live Workshop)" is not wanted anywhere. It is a placeholder module
--    nothing references yet (no progress rows, never an active session
--    module), so it is removed outright.
-- 2. EA Experience Assessment: Name (Q1) and Email (Q2) are already captured
--    at registration, so they are removed from the assessment. Saved as a new
--    version; submissions already completed stay tied to the version they
--    were completed under.
delete from public.modules
where key = 'character_live'
  and not exists (select 1 from public.participant_module_progress p where p.module_id = modules.id)
  and not exists (select 1 from public.sessions s where s.active_module_id = modules.id)
  and not exists (select 1 from public.participant_sessions ps where ps.current_module_id = modules.id);

do $$
declare
  v_assessment uuid;
  v_cfg jsonb;
  v_next int;
begin
  select id into v_assessment from public.structured_assessments where assessment_key = 'ea_experience_assessment';
  if v_assessment is null then return; end if;

  select config into v_cfg
    from public.structured_assessment_versions
    where assessment_id = v_assessment and config->>'is_current' = 'true';
  if v_cfg is null then return; end if;
  -- Already removed (re-run safe).
  if not exists (
    select 1 from jsonb_array_elements(v_cfg->'questions') q where q->>'id' in ('q1', 'q2')
  ) then return; end if;

  select coalesce(max(version_number), 0) + 1 into v_next
    from public.structured_assessment_versions where assessment_id = v_assessment;

  update public.structured_assessment_versions
    set config = jsonb_set(config, '{is_current}', 'false'::jsonb)
    where assessment_id = v_assessment;

  insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
  values (
    v_assessment, v_next, null,
    jsonb_set(v_cfg, '{is_current}', 'true'::jsonb)
      || jsonb_build_object(
        'version', v_next,
        'questions', (
          select coalesce(jsonb_agg(q order by ord), '[]'::jsonb)
          from jsonb_array_elements(v_cfg->'questions') with ordinality as t(q, ord)
          where q->>'id' not in ('q1', 'q2')
        )
      )
  );
end $$;
