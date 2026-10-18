-- High-Leverage Handoff, version 2 (client "Handoff updates" tab).
--   * Opportunity screen: only the question above the text field.
--   * Thinking Trap screen removed (and with it the "Thinking Trap to Watch"
--     line on the finished Handoff -- review.stick = null).
--   * Commitment screen: adds a "None of the above" choice.
--   * Supporting Mechanism screen: new option wording + "None of the above"
--     (the existing optional "Other" box stays).
--   * Last screen: "What does success for this handoff look like at 90 days?"
-- v1 is flipped to not-current; participants who already started or finished
-- keep their v1 link, so nothing they saved changes.
do $$
declare
  v_assessment uuid;
  v_cfg jsonb;
  v_next int;
  v_steps jsonb;
begin
  select id into v_assessment from public.structured_assessments where assessment_key = 'high_leverage_handoff';
  if v_assessment is null then return; end if;

  select config into v_cfg
  from public.structured_assessment_versions
  where assessment_id = v_assessment and (config->>'is_current') = 'true'
  limit 1;
  if v_cfg is null then return; end if;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.structured_assessment_versions where assessment_id = v_assessment;

  select jsonb_agg(
    case s->>'id'
      when 'opportunity' then jsonb_set(s, '{helper}', '[]'::jsonb)
      when 'commitments' then s || jsonb_build_object('noneOption', 'None of the above')
      when 'mechanisms' then s || jsonb_build_object(
        'options', jsonb_build_array(
          'Passive visibility through a shared tracker',
          'Clear prioritization criteria managed by your EA',
          'Intentional delegation, including a Definition of Success',
          'Defined decision rights for your EA',
          'Clear escalation criteria',
          'Better decision facilitation by your EA'),
        'noneOption', 'None of the above')
      when 'd90' then jsonb_set(s, '{prompt}', to_jsonb('What does success for this handoff look like at 90 days?'::text))
      else s
    end
    order by ord)
  into v_steps
  from jsonb_array_elements(v_cfg->'steps') with ordinality as t(s, ord)
  where s->>'id' <> 'trap';

  update public.structured_assessment_versions
    set config = jsonb_set(config, '{is_current}', 'false'::jsonb)
    where assessment_id = v_assessment;

  insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
  values (
    v_assessment, v_next, null,
    jsonb_set(
      jsonb_set(jsonb_set(v_cfg, '{steps}', v_steps), '{is_current}', 'true'::jsonb),
      '{review,stick}', 'null'::jsonb, true)
    || jsonb_build_object('version', v_next)
  );
end $$;
