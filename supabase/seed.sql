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
