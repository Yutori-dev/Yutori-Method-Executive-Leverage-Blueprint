-- Development-only seed data.
--
-- IMPORTANT: this file is applied by `supabase db reset` in local
-- development only. Never run it against the production project — it
-- contains a demo Session and a placeholder assessment that must not appear
-- to real participants (task instructions section 14 / 18).
--
-- Admin users are NOT seeded here because they require a real auth.users
-- identity (email + magic-link capable account), which needs the Supabase
-- Auth admin API rather than plain SQL. Use
-- `npm run seed:admin -- you@example.com "Your Name"` after this file runs.

insert into public.sessions (name, organization, event_date, format, status, join_code)
values (
  'Dev Preview Session',
  'Yutori Method (internal)',
  current_date,
  'virtual',
  'active',
  'DEV-PREVIEW'
)
on conflict (join_code) do nothing;

-- A second session to exercise "same participant, multiple sessions" and
-- session-switching in the dashboard during manual testing.
insert into public.sessions (name, organization, event_date, format, status, join_code)
values (
  'St. Louis YPO Gold — October 2026 (dev copy)',
  'YPO Gold St. Louis',
  '2026-10-15',
  'virtual',
  'draft',
  'STL-YPO-OCT26'
)
on conflict (join_code) do nothing;

-- Placeholder assessment demonstrating the configurable activity engine +
-- autosave pattern. Real Yutori content (brief section 30, Dependency A)
-- replaces this in a later milestone; it must never reach production.
insert into public.assessments (key, name, version, active, is_placeholder)
values (
  'dev_demo_operating_altitude',
  '[YUTORI CONTENT PENDING] Operating Altitude (dev demo)',
  1,
  true,
  true
)
on conflict (key, version) do update set name = excluded.name;

do $$
declare
  v_assessment_id uuid;
  v_q1 uuid;
  v_q2 uuid;
begin
  select id into v_assessment_id
  from public.assessments
  where key = 'dev_demo_operating_altitude' and version = 1;

  insert into public.questions (assessment_id, prompt, type, config, required, sort_order)
  values (
    v_assessment_id,
    '[YUTORI CONTENT PENDING] In a typical week, how much of your time goes to work only you can do?',
    'multiple_choice',
    '{}'::jsonb,
    true,
    1
  )
  returning id into v_q1;

  insert into public.answer_options (question_id, label, value, score_value, sort_order)
  values
    (v_q1, '[PENDING] Almost all of it', 'almost_all', 3, 1),
    (v_q1, '[PENDING] About half', 'about_half', 2, 2),
    (v_q1, '[PENDING] Less than half', 'less_than_half', 1, 3);

  insert into public.questions (assessment_id, prompt, type, config, required, sort_order)
  values (
    v_assessment_id,
    '[YUTORI CONTENT PENDING] How often do decisions stall waiting on you specifically?',
    'rating_scale',
    '{"min":1,"max":5,"min_label":"Rarely","max_label":"Constantly"}'::jsonb,
    true,
    2
  )
  returning id into v_q2;

  insert into public.questions (assessment_id, prompt, type, config, required, sort_order)
  values (
    v_assessment_id,
    '[YUTORI CONTENT PENDING] Describe one thing on your plate this week that felt below your altitude.',
    'free_text',
    '{"placeholder":"Type a short reflection..."}'::jsonb,
    false,
    3
  );
end $$;

-- ---------------------------------------------------------------------------
-- Milestone 2: placeholder Responsibility Library (content dependency B).
-- Labels/descriptions are invented only to make the selection/rating/matrix
-- mechanism testable -- they are not Yutori's final library.
-- ---------------------------------------------------------------------------
insert into public.responsibilities (key, label, description, leverage_level, sort_order, is_placeholder) values
  ('inbox_management', '[PENDING] Inbox management', 'Triaging and responding to daily email.', 'execution', 1, true),
  ('calendar_scheduling', '[PENDING] Calendar scheduling', 'Booking and adjusting meetings.', 'execution', 2, true),
  ('travel_booking', '[PENDING] Travel booking', 'Arranging flights, hotels, itineraries.', 'execution', 3, true),
  ('expense_reporting', '[PENDING] Expense reporting', 'Submitting and reconciling expenses.', 'execution', 4, true),
  ('customer_escalations', '[PENDING] Customer escalation handling', 'Responding to escalated customer issues.', 'execution', 5, true),
  ('meeting_preparation', '[PENDING] Meeting preparation', 'Agendas, materials, and pre-reads.', 'orchestration', 6, true),
  ('cross_team_coordination', '[PENDING] Cross-team coordination', 'Keeping initiatives moving across teams.', 'orchestration', 7, true),
  ('project_status_tracking', '[PENDING] Project status tracking', 'Following up on open items and deadlines.', 'orchestration', 8, true),
  ('vendor_management', '[PENDING] Vendor management', 'Managing outside vendor relationships.', 'orchestration', 9, true),
  ('hiring_coordination', '[PENDING] Hiring process coordination', 'Scheduling and tracking candidate pipelines.', 'orchestration', 10, true),
  ('sales_pipeline_review', '[PENDING] Sales pipeline review', 'Reviewing deal stages and forecasts.', 'orchestration', 11, true),
  ('board_meeting_prep', '[PENDING] Board meeting prep', 'Preparing materials and narrative for the board.', 'strategic', 12, true),
  ('partnership_development', '[PENDING] Strategic partnership development', 'Identifying and cultivating key partnerships.', 'strategic', 13, true),
  ('annual_planning', '[PENDING] Annual planning', 'Setting company-level goals and priorities.', 'strategic', 14, true),
  ('investor_relations', '[PENDING] Investor relations', 'Communicating with investors/stakeholders.', 'strategic', 15, true),
  ('culture_stewardship', '[PENDING] Culture and values stewardship', 'Reinforcing culture through decisions and rituals.', 'strategic', 16, true),
  ('analytics_review', '[PENDING] Reporting and analytics review', 'Reviewing dashboards and KPIs.', 'systems', 17, true),
  ('workflow_automation', '[PENDING] Workflow automation setup', 'Building automations for repetitive work.', 'systems', 18, true),
  ('tooling_evaluation', '[PENDING] Tooling and software evaluation', 'Assessing new tools/systems.', 'systems', 19, true),
  ('crm_data_hygiene', '[PENDING] CRM and data hygiene', 'Keeping records clean and current.', 'systems', 20, true)
on conflict (key, version) do nothing;

-- ---------------------------------------------------------------------------
-- Milestone 2: placeholder 9-cell Zone of Investment mapping (content
-- dependency C). This specific cell-to-zone assignment is an invented
-- placeholder for exercising the mechanism -- it is explicitly NOT Yutori's
-- approved methodology and must be replaced wholesale once supplied.
-- ---------------------------------------------------------------------------
insert into public.zone_matrix_cells (competency_level, passion_level, cell_name, macro_zone, explanation, is_placeholder) values
  ('high',   'high',   '[PENDING] Sweet Spot',              'investment',   '[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('high',   'medium', '[PENDING] Strong Fit',              'investment',   '[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('medium', 'high',   '[PENDING] Growth Zone',             'investment',   '[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('medium', 'medium', '[PENDING] Steady but Unclear',      'ambiguity',    '[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('high',   'low',    '[PENDING] Skilled but Unmotivated', 'ambiguity',    '[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('low',    'high',   '[PENDING] Eager but Underdeveloped','ambiguity',    '[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('medium', 'low',    '[PENDING] Draining',                'vulnerability','[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('low',    'medium', '[PENDING] Misaligned',              'vulnerability','[YUTORI CONTENT PENDING] Placeholder cell explanation.', true),
  ('low',    'low',    '[PENDING] Clear Delegate',          'vulnerability','[YUTORI CONTENT PENDING] Placeholder cell explanation.', true)
on conflict (competency_level, passion_level, version) do nothing;

-- ---------------------------------------------------------------------------
-- Milestone 2: placeholder Delegation Beliefs assessment (content
-- dependency D). Two dimensions so calculate_delegation_readiness() has
-- something real to aggregate; scoring rules stay unseeded on purpose (see
-- assessment_scoring_rules), so the readiness result always shows the
-- controlled fallback, never an invented interpretation.
-- ---------------------------------------------------------------------------
insert into public.assessments (key, name, version, active, is_placeholder)
values (
  'dev_demo_delegation_beliefs',
  '[YUTORI CONTENT PENDING] Delegation Beliefs (dev demo)',
  1,
  true,
  true
)
on conflict (key, version) do update set name = excluded.name;

do $$
declare
  v_assessment_id uuid;
  v_q1 uuid;
  v_q3 uuid;
begin
  select id into v_assessment_id
  from public.assessments
  where key = 'dev_demo_delegation_beliefs' and version = 1;

  insert into public.questions (assessment_id, prompt, type, config, required, sort_order)
  values (
    v_assessment_id,
    '[YUTORI CONTENT PENDING] How much do you trust others to complete work to your standard without close supervision?',
    'rating_scale',
    '{"min":1,"max":5,"min_label":"Not at all","max_label":"Completely","dimension":"trust"}'::jsonb,
    true,
    1
  );

  insert into public.questions (assessment_id, prompt, type, config, required, sort_order)
  values (
    v_assessment_id,
    '[YUTORI CONTENT PENDING] When you have delegated something in the past, what usually happened?',
    'multiple_choice',
    '{"dimension":"trust"}'::jsonb,
    true,
    2
  )
  returning id into v_q1;

  insert into public.answer_options (question_id, label, value, score_value, sort_order)
  values
    (v_q1, '[PENDING] It went well and I let go of it', 'went_well', 3, 1),
    (v_q1, '[PENDING] I ended up redoing it myself', 'redid_it', 1, 2),
    (v_q1, '[PENDING] I never really let go of it', 'never_let_go', 2, 3);

  insert into public.questions (assessment_id, prompt, type, config, required, sort_order)
  values (
    v_assessment_id,
    '[YUTORI CONTENT PENDING] How uncomfortable do you feel when you do not know the details of how something got done?',
    'rating_scale',
    '{"min":1,"max":5,"min_label":"Very comfortable","max_label":"Very uncomfortable","dimension":"control"}'::jsonb,
    true,
    3
  );

  insert into public.questions (assessment_id, prompt, type, config, required, sort_order)
  values (
    v_assessment_id,
    '[YUTORI CONTENT PENDING] Which best describes how you typically hand off a task?',
    'multiple_choice',
    '{"dimension":"control"}'::jsonb,
    true,
    4
  )
  returning id into v_q3;

  insert into public.answer_options (question_id, label, value, score_value, sort_order)
  values
    (v_q3, '[PENDING] I give the outcome and let them figure out how', 'outcome_only', 3, 1),
    (v_q3, '[PENDING] I give detailed step-by-step instructions', 'step_by_step', 2, 2),
    (v_q3, '[PENDING] I usually just do it myself', 'do_it_myself', 1, 3);
end $$;
