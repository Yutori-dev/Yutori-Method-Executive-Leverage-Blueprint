-- EA Leverage & Orchestration Audit, version 1 of both specs (Visionary
-- and EA versions). Same 15 responsibilities, scales and classification
-- math on both sides (see leverageAuditSchema.ts's comment) -- built once
-- as plpgsql variables and reused across the two version inserts so the
-- shared parts can't drift between the two configs.
do $$
declare
  v_responsibilities jsonb;
  v_macro_categories jsonb;
  v_ownership_levels jsonb;
  v_direction_options jsonb;
  v_visionary_id uuid;
  v_ea_id uuid;
begin
  v_macro_categories := jsonb_build_array(
    jsonb_build_object('id', 'executive_capacity', 'name', 'Executive Capacity'),
    jsonb_build_object('id', 'attention_information', 'name', 'Attention & Information'),
    jsonb_build_object('id', 'execution_follow_through', 'name', 'Execution & Follow-Through'),
    jsonb_build_object('id', 'executive_enablement', 'name', 'Executive Enablement')
  );

  v_ownership_levels := jsonb_build_array(
    jsonb_build_object('value', 0, 'label', 'Visionary-Owned', 'description', 'I primarily own this. My EA has little or no involvement.'),
    jsonb_build_object('value', 1, 'label', 'Task Support', 'description', 'My EA completes tasks I assign, but I initiate and direct the work.'),
    jsonb_build_object('value', 2, 'label', 'Coordination', 'description', 'My EA coordinates the work, but still relies on me for meaningful direction, context or follow-through.'),
    jsonb_build_object('value', 3, 'label', 'Orchestration', 'description', 'My EA proactively coordinates people, information and next steps with limited involvement from me.'),
    jsonb_build_object('value', 4, 'label', 'Proactive Ownership', 'description', 'My EA anticipates needs and owns this end-to-end within agreed parameters, involving me only when needed.')
  );

  v_direction_options := jsonb_build_array(
    jsonb_build_object('value', -1, 'label', 'Less ownership than today'),
    jsonb_build_object('value', 0, 'label', 'The current level is right'),
    jsonb_build_object('value', 1, 'label', 'More ownership than today')
  );

  v_responsibilities := jsonb_build_array(
    jsonb_build_object('id', 'EA01', 'type', 'EA', 'macroCategory', 'executive_capacity', 'name', 'Calendar & Priority Protection', 'description', 'Managing your calendar, resolving scheduling conflicts and protecting time for your highest priorities.'),
    jsonb_build_object('id', 'EA02', 'type', 'EA', 'macroCategory', 'executive_capacity', 'name', 'Travel & Logistics', 'description', 'Managing travel, events and other logistics surrounding your professional commitments.'),
    jsonb_build_object('id', 'EA03', 'type', 'EA', 'macroCategory', 'executive_capacity', 'name', 'Meeting Readiness', 'description', 'Ensuring you have the context, materials and preparation needed for important meetings.'),
    jsonb_build_object('id', 'EA04', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Communication Flow', 'description', 'Monitoring and filtering messages, requests and follow-ups so the right communication reaches your attention at the right time.'),
    jsonb_build_object('id', 'EA05', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Open-Loop Management', 'description', 'Capturing your ideas, asks, reminders and follow-ups in a trusted system so you do not have to hold them in your head.'),
    jsonb_build_object('id', 'EA06', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Information & Context Management', 'description', 'Organizing the information and context surrounding your work so it is available when you or others need it.'),
    jsonb_build_object('id', 'EA07', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Visibility & Executive Signal', 'description', 'Maintaining passive visibility into ongoing work while proactively surfacing what warrants your attention.'),
    jsonb_build_object('id', 'EA08', 'type', 'EA', 'macroCategory', 'execution_follow_through', 'name', 'Commitments & Follow-Through', 'description', 'Capturing decisions, commitments and next steps and ensuring they move through to completion.'),
    jsonb_build_object('id', 'EA09', 'type', 'EA', 'macroCategory', 'execution_follow_through', 'name', 'Priority & Task Flow', 'description', 'Maintaining visibility into your active and upcoming priorities and keeping work appropriately sequenced.'),
    jsonb_build_object('id', 'EA10', 'type', 'EA', 'macroCategory', 'execution_follow_through', 'name', 'Project Coordination', 'description', 'Coordinating people, inputs, timelines and next steps for projects or initiatives in your orbit.'),
    jsonb_build_object('id', 'EA11', 'type', 'EA', 'macroCategory', 'executive_enablement', 'name', 'Relationship Management', 'description', 'Maintaining context, commitments, follow-ups and appropriate touchpoints across important professional relationships.'),
    jsonb_build_object('id', 'EA12', 'type', 'EA', 'macroCategory', 'executive_enablement', 'name', 'Decision Facilitation', 'description', 'Preparing decisions by gathering context, surfacing tradeoffs and organizing options or recommendations.'),
    jsonb_build_object('id', 'COS01', 'type', 'COS', 'macroCategory', null, 'name', 'Enterprise Priority Management', 'description', 'Resolving conflicts among organizational priorities and making tradeoffs about where the company focuses its resources and attention.'),
    jsonb_build_object('id', 'COS02', 'type', 'COS', 'macroCategory', null, 'name', 'Leadership-Team Accountability', 'description', 'Holding senior leaders accountable for commitments and addressing cross-functional breakdowns that affect company priorities.'),
    jsonb_build_object('id', 'COS03', 'type', 'COS', 'macroCategory', null, 'name', 'Strategy-to-Execution Leadership', 'description', 'Translating company strategy into coordinated execution across teams and driving progress against company-level priorities.')
  );

  select id into v_visionary_id from public.structured_assessments where assessment_key = 'ea_leverage_audit_visionary';
  select id into v_ea_id from public.structured_assessments where assessment_key = 'ea_leverage_audit_ea';

  insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
  values (
    v_visionary_id, 1, null,
    jsonb_build_object(
      'is_current', true,
      'variant', 'visionary',
      'intro', jsonb_build_object('title', 'EA Leverage & Orchestration Audit', 'body', jsonb_build_array(
        'A few questions about how ownership is currently distributed between you and your EA.'
      )),
      'exitMessage', 'This audit is designed to assess ownership within a current EA relationship. Your workshop facilitator will guide you to the appropriate exercise.',
      'contextQuestions', jsonb_build_array(
        jsonb_build_object(
          'id', 'ea_tenure', 'prompt', 'How long has your current EA been supporting you?', 'exitOnValue', 'no_ea',
          'options', jsonb_build_array(
            jsonb_build_object('value', 'lt_3m', 'label', 'Less than 3 months'),
            jsonb_build_object('value', '3_6m', 'label', '3-6 months'),
            jsonb_build_object('value', '7_12m', 'label', '7-12 months'),
            jsonb_build_object('value', '1_2y', 'label', '1-2 years'),
            jsonb_build_object('value', 'gt_2y', 'label', 'More than 2 years'),
            jsonb_build_object('value', 'no_ea', 'label', 'I do not currently have an EA')
          )
        ),
        jsonb_build_object(
          'id', 'ea_capacity', 'prompt', 'Approximately what percentage of your EA''s working capacity is dedicated to supporting you and your priorities?',
          'options', jsonb_build_array(
            jsonb_build_object('value', '75_100', 'label', '75-100%'),
            jsonb_build_object('value', '50_74', 'label', '50-74%'),
            jsonb_build_object('value', '25_49', 'label', '25-49%'),
            jsonb_build_object('value', 'lt_25', 'label', 'Less than 25%'),
            jsonb_build_object('value', 'not_sure', 'label', 'I''m not sure')
          )
        )
      ),
      'ownershipLevels', v_ownership_levels,
      'directionOptions', v_direction_options,
      'responsibilities', v_responsibilities,
      'macroCategories', v_macro_categories,
      'resultHeading', 'Your EA Leverage & Orchestration Snapshot',
      'sectionA', jsonb_build_object('heading', 'Areas Where Greater EA Support Could Unlock More Leverage', 'intro', 'These are areas where you want greater EA ownership and your EA is currently operating below the orchestration level.'),
      'sectionB', jsonb_build_object('heading', 'Areas Where You Are Appropriately Supported & Leveraged', 'intro', 'These are areas where your EA is already operating with meaningful orchestration or proactive ownership and the current level of support feels right to you.'),
      'sectionC', jsonb_build_object(
        'heading', 'Areas Where Your EA Is Flexing Into Chief of Staff Territory',
        'intro', 'Your EA currently holds meaningful ownership in responsibilities that extend beyond traditional EA orchestration and into broader organizational leadership.',
        'reactionPrefix', 'You would like greater ownership in this area.',
        'closing', 'Consider whether the role, authority and capacity surrounding these responsibilities match the level of ownership your EA is carrying.'
      )
    )
  )
  on conflict (assessment_id, version_number) do nothing;

  insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
  values (
    v_ea_id, 1, null,
    jsonb_build_object(
      'is_current', true,
      'variant', 'ea',
      'intro', jsonb_build_object('title', 'EA Leverage & Orchestration Audit', 'body', jsonb_build_array(
        'A few questions about how ownership is currently distributed between you and your executive.'
      )),
      'exitMessage', '',
      'contextQuestions', jsonb_build_array(
        jsonb_build_object(
          'id', 'ea_capacity', 'prompt', 'Approximately what percentage of your working capacity is dedicated to supporting your executive and their priorities?',
          'options', jsonb_build_array(
            jsonb_build_object('value', '75_100', 'label', '75-100%'),
            jsonb_build_object('value', '50_74', 'label', '50-74%'),
            jsonb_build_object('value', '25_49', 'label', '25-49%'),
            jsonb_build_object('value', 'lt_25', 'label', 'Less than 25%')
          )
        )
      ),
      'ownershipLevels', jsonb_build_array(
        jsonb_build_object('value', 0, 'label', 'Executive-Owned', 'description', 'My executive primarily owns this. I have little or no involvement.'),
        jsonb_build_object('value', 1, 'label', 'Task Support', 'description', 'I complete tasks my executive assigns, but they initiate and direct the work.'),
        jsonb_build_object('value', 2, 'label', 'Coordination', 'description', 'I coordinate the work, but still rely on my executive for meaningful direction, context or follow-through.'),
        jsonb_build_object('value', 3, 'label', 'Orchestration', 'description', 'I proactively coordinate people, information and next steps with limited involvement from my executive.'),
        jsonb_build_object('value', 4, 'label', 'Proactive Ownership', 'description', 'I anticipate needs and own this end-to-end within agreed parameters, involving my executive only when needed.')
      ),
      'directionOptions', jsonb_build_array(
        jsonb_build_object('value', -1, 'label', 'Less ownership than today'),
        jsonb_build_object('value', 0, 'label', 'The current level is right'),
        jsonb_build_object('value', 1, 'label', 'More ownership than today')
      ),
      -- Same 15 responsibility ids/order/macro categories as the executive
      -- version (spec requirement), EA-facing description wording.
      'responsibilities', jsonb_build_array(
        jsonb_build_object('id', 'EA01', 'type', 'EA', 'macroCategory', 'executive_capacity', 'name', 'Calendar & Priority Protection', 'description', 'Managing your executive''s calendar, resolving scheduling conflicts and protecting time for their highest priorities.'),
        jsonb_build_object('id', 'EA02', 'type', 'EA', 'macroCategory', 'executive_capacity', 'name', 'Travel & Logistics', 'description', 'Managing travel, events and other logistics surrounding your executive''s professional commitments.'),
        jsonb_build_object('id', 'EA03', 'type', 'EA', 'macroCategory', 'executive_capacity', 'name', 'Meeting Readiness', 'description', 'Ensuring your executive has the context, materials and preparation needed for important meetings.'),
        jsonb_build_object('id', 'EA04', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Communication Flow', 'description', 'Monitoring and filtering messages, requests and follow-ups so the right communication reaches your executive''s attention at the right time.'),
        jsonb_build_object('id', 'EA05', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Open-Loop Management', 'description', 'Capturing your executive''s ideas, asks, reminders and follow-ups in a trusted system so they do not have to hold them in their head.'),
        jsonb_build_object('id', 'EA06', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Information & Context Management', 'description', 'Organizing the information and context surrounding your executive''s work so it is available when they or others need it.'),
        jsonb_build_object('id', 'EA07', 'type', 'EA', 'macroCategory', 'attention_information', 'name', 'Visibility & Executive Signal', 'description', 'Maintaining passive visibility into ongoing work while proactively surfacing what warrants your executive''s attention.'),
        jsonb_build_object('id', 'EA08', 'type', 'EA', 'macroCategory', 'execution_follow_through', 'name', 'Commitments & Follow-Through', 'description', 'Capturing decisions, commitments and next steps and ensuring they move through to completion.'),
        jsonb_build_object('id', 'EA09', 'type', 'EA', 'macroCategory', 'execution_follow_through', 'name', 'Priority & Task Flow', 'description', 'Maintaining visibility into your executive''s active and upcoming priorities and keeping work appropriately sequenced.'),
        jsonb_build_object('id', 'EA10', 'type', 'EA', 'macroCategory', 'execution_follow_through', 'name', 'Project Coordination', 'description', 'Coordinating people, inputs, timelines and next steps for projects or initiatives in your executive''s orbit.'),
        jsonb_build_object('id', 'EA11', 'type', 'EA', 'macroCategory', 'executive_enablement', 'name', 'Relationship Management', 'description', 'Maintaining context, commitments, follow-ups and appropriate touchpoints across your executive''s important professional relationships.'),
        jsonb_build_object('id', 'EA12', 'type', 'EA', 'macroCategory', 'executive_enablement', 'name', 'Decision Facilitation', 'description', 'Preparing decisions by gathering context, surfacing tradeoffs and organizing options or recommendations.'),
        jsonb_build_object('id', 'COS01', 'type', 'COS', 'macroCategory', null, 'name', 'Enterprise Priority Management', 'description', 'Resolving conflicts among organizational priorities and making tradeoffs about where the company focuses its resources and attention.'),
        jsonb_build_object('id', 'COS02', 'type', 'COS', 'macroCategory', null, 'name', 'Leadership-Team Accountability', 'description', 'Holding senior leaders accountable for commitments and addressing cross-functional breakdowns that affect company priorities.'),
        jsonb_build_object('id', 'COS03', 'type', 'COS', 'macroCategory', null, 'name', 'Strategy-to-Execution Leadership', 'description', 'Translating company strategy into coordinated execution across teams and driving progress against company-level priorities.')
      ),
      'macroCategories', v_macro_categories,
      'resultHeading', 'Your EA Leverage & Orchestration Snapshot',
      'sectionA', jsonb_build_object('heading', 'Opportunities to Expand Your Impact', 'intro', 'These are areas where you see an opportunity to take greater ownership and create additional leverage for your executive.'),
      'sectionB', jsonb_build_object('heading', 'Areas Where You Are Already Creating Meaningful Leverage', 'intro', 'These are areas where you are already creating meaningful leverage through orchestration or proactive ownership and the current level feels right to you.'),
      'sectionC', jsonb_build_object(
        'heading', 'Areas Where You Are Delivering Above and Beyond Traditional EA Scope',
        'intro', 'These are areas where you are currently contributing above and beyond traditional EA scope by taking meaningful ownership of broader organizational responsibilities.',
        'reactionPrefix', 'You see an opportunity to take greater ownership in this area.',
        'closing', 'As you consider these areas, think about the clarity, capacity and support that help you contribute effectively at this level.'
      )
    )
  )
  on conflict (assessment_id, version_number) do nothing;
end $$;
