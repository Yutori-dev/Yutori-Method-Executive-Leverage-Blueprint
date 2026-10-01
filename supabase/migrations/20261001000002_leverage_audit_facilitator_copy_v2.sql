-- Version 2 of both Leverage Audit configs: adds the facilitator-dashboard
-- copy (verbatim from the specs) so it is editable and versioned like all
-- other copy. v1 is flipped to not-current first (partial unique index
-- allows one current version); existing submissions keep their v1 link.
do $$
declare
  v_ea_ids text[] := array['EA01','EA02','EA03','EA04','EA05','EA06','EA07','EA08','EA09','EA10','EA11','EA12'];
  v_labels text[] := array[
    'Greater Calendar & Priority Ownership Is Needed','Greater Logistics Ownership Is Needed','Executives Want More Proactive Meeting Preparation',
    'Executives Want a Stronger Filter Around Their Attention','Executives Want More Open Loops Held by Their EAs','Executives Want More Information & Context Held Outside Their Heads',
    'Executives Want Better Signal Without More Involvement','Executives Want EAs Driving More Follow-Through','Executives Want More Ownership of Priority Flow',
    'Executives Want Greater EA Ownership of Project Coordination','Executives Want More Proactive Relationship Continuity','Executives Want Decisions Better Prepared Before They Reach Them'];
  v_areas text[] := array[
    'calendar and priority protection','travel and logistics','meeting readiness','communication flow','open-loop management','information and context management',
    'visibility and executive signal','commitments and follow-through','priority and task flow','project coordination','relationship management','decision facilitation'];
  v_points text[] := array[
    'These executives want their EAs to absorb more of the judgment and coordination surrounding how their time is protected and allocated.',
    'These executives want more of the coordination surrounding travel, events and professional commitments owned by their EAs.',
    'These executives want greater EA ownership of ensuring they enter important meetings prepared.',
    'These executives want more of the monitoring and filtering surrounding incoming communication absorbed by their EAs.',
    'These executives want a more reliable system around them for capturing and holding ideas, asks, reminders and follow-ups.',
    'These executives want more of the information and context surrounding their work organized and maintained by their EAs.',
    'These executives want their EAs to maintain stronger visibility while proactively surfacing what requires their attention.',
    'These executives want more of the closure loop around decisions, commitments and next steps owned by their EAs.',
    'These executives want their EAs playing a stronger role in maintaining and sequencing active and upcoming priorities.',
    'These executives want less personal responsibility for coordinating the people, inputs, timelines and next steps surrounding projects in their orbit.',
    'These executives want more of the context, commitments and follow-through surrounding important relationships maintained by their EAs.',
    'These executives want more of the context, tradeoffs, options and recommendations assembled before decisions reach them.'];
  v_insights jsonb := '{}'::jsonb;
  v_cos jsonb;
  v_ea_key text;
  v_assessment uuid;
  v_cfg jsonb;
  v_next int;
  i int;
begin
  for i in 1..12 loop
    v_insights := v_insights || jsonb_build_object(v_ea_ids[i], jsonb_build_object(
      'label', v_labels[i],
      'interpretation', '[XX%] of the cohort want greater EA ownership in ' || v_areas[i] || ' and currently experience this area below the orchestration level.',
      'talkingPoint', v_points[i]));
  end loop;

  v_cos := jsonb_build_object(
    'COS01', 'EAs with substantial ownership here are participating in company-level prioritization and resource tradeoffs, extending the role beyond traditional EA orchestration.',
    'COS02', 'EAs with substantial ownership here are carrying accountability across senior leaders and cross-functional work, extending the role into broader organizational leadership.',
    'COS03', 'EAs with substantial ownership here are helping drive company strategy into coordinated cross-functional execution, extending the role beyond executive support and orchestration.');

  foreach v_ea_key in array array['ea_leverage_audit_visionary','ea_leverage_audit_ea'] loop
    select id into v_assessment from public.structured_assessments where assessment_key = v_ea_key;
    select config into v_cfg from public.structured_assessment_versions where assessment_id = v_assessment and version_number = 1;
    if v_cfg is null then continue; end if;
    select coalesce(max(version_number),0) + 1 into v_next from public.structured_assessment_versions where assessment_id = v_assessment;
    if v_next <> 2 then continue; end if;

    update public.structured_assessment_versions
      set config = jsonb_set(config, '{is_current}', 'false'::jsonb)
      where assessment_id = v_assessment;

    insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
    values (v_assessment, 2, null,
      jsonb_set(v_cfg, '{is_current}', 'true'::jsonb) || jsonb_build_object('facilitator',
        case when v_ea_key = 'ea_leverage_audit_visionary' then
          jsonb_build_object('insights', v_insights, 'cosTalkingPoints', v_cos,
            'appropriateTemplate', '[XX%] of the cohort report orchestration or proactive ownership in this area and say the current level feels right.')
        else
          jsonb_build_object('opportunityTemplate', '[XX%] of EAs see an opportunity to take greater ownership in this area.',
            'appropriateTemplate', '[XX%] of EAs report orchestration or proactive ownership in this area and say the current level feels right.')
        end));
  end loop;
end $$;
