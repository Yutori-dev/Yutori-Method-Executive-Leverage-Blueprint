-- Version 3 of both Leverage Audit configs: exposes the classification,
-- ranking and dyad-comparison thresholds as admin-editable config (spec
-- section 17/19: "cohort ranking logic", "dyad comparison thresholds").
-- Values are exactly the spec's published rules, so behaviour is unchanged
-- until an admin edits them. Previous versions are kept; submissions stay
-- linked to the version they were completed under.
do $$
declare
  v_key text;
  v_assessment uuid;
  v_cfg jsonb;
  v_next int;
begin
  foreach v_key in array array['ea_leverage_audit_visionary','ea_leverage_audit_ea'] loop
    select id into v_assessment from public.structured_assessments where assessment_key = v_key;
    if v_assessment is null then continue; end if;

    select config into v_cfg
      from public.structured_assessment_versions
      where assessment_id = v_assessment and config->>'is_current' = 'true';
    if v_cfg is null or v_cfg ? 'rules' then continue; end if;

    select coalesce(max(version_number),0) + 1 into v_next
      from public.structured_assessment_versions where assessment_id = v_assessment;

    update public.structured_assessment_versions
      set config = jsonb_set(config, '{is_current}', 'false'::jsonb)
      where assessment_id = v_assessment;

    insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
    values (v_assessment, v_next, null,
      jsonb_set(v_cfg, '{is_current}', 'true'::jsonb) || jsonb_build_object('version', v_next, 'rules', jsonb_build_object(
        'orchestrationMin', 3,
        'moreDirection', 1,
        'rightDirection', 0,
        'alignedMaxDiff', 0,
        'adjacentMaxDiff', 1,
        'topN', 5)));
  end loop;
end $$;
