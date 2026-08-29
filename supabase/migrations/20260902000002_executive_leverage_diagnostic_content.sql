-- Executive Leverage Diagnostic (TM) -- real, approved content (Developer
-- Implementation Specification V1). Ships to every environment, like
-- 20260829000005_seed_modules.sql -- this is real Yutori-approved copy,
-- not placeholder content, so it does not belong in the dev-only seed.sql
-- and must not be gated by isProduction.
--
-- sort_order always follows the spec's required display order (A-E within
-- a question, and Baseline/Q1-Q14 across questions) independently of
-- score_value, per the spec's own note that scoring may run 4->0 or 0->4
-- regardless of display order (in this content every scored question does
-- run 4->0, but each option's score is still written out explicitly rather
-- than derived, so a future question that reverses the direction is just
-- a data change).

do $$
declare
  v_assessment_id uuid;
  v_baseline uuid;
  v_q1 uuid; v_q2 uuid; v_q3 uuid; v_q4 uuid; v_q5 uuid;
  v_q6 uuid; v_q7 uuid; v_q8 uuid; v_q9 uuid; v_q10 uuid;
  v_q11 uuid; v_q12 uuid; v_q13 uuid; v_q14 uuid;
begin
  insert into public.assessments (key, name, version, active, is_placeholder)
  values ('executive_leverage_diagnostic', 'Executive Leverage Diagnostic™', 1, true, false)
  returning id into v_assessment_id;

  -- Baseline -- unscored, dashboard-visible, not in participant profile calc.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'Thinking across your life as a whole, how would you describe your current capacity?',
    'multiple_choice', true, 0, false, true, null, null, null
  )
  returning id into v_baseline;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, metadata) values
    (v_baseline, 'I have enough capacity for the things that matter most to me, with room for the unexpected.', 'A', null, 0, '{}'::jsonb),
    (v_baseline, 'I generally have enough capacity for what matters, but unexpected demands can create pressure.', 'B', null, 1, '{}'::jsonb),
    (v_baseline, 'I regularly have to choose between important priorities because I don''t have capacity for all of them.', 'C', null, 2, '{"capacity_pressure": true}'::jsonb),
    (v_baseline, 'I feel stretched across my commitments most of the time.', 'D', null, 3, '{"capacity_pressure": true}'::jsonb),
    (v_baseline, 'I regularly sacrifice something important because I don''t have the capacity for everything that needs or deserves my attention.', 'E', null, 4, '{"capacity_pressure": true}'::jsonb);

  -- Q1 -- Execution Burden. tie_break_priority 7.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, how much of your professional time is spent personally completing administrative, coordination or routine execution work?',
    'multiple_choice', true, 1, true, true,
    'Execution Burden',
    'A meaningful amount of your professional capacity is being consumed by administrative, coordination or routine execution work.',
    7
  )
  returning id into v_q1;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q1, 'Very little or none', 'A', 4, 0),
    (v_q1, 'Less than 10%', 'B', 3, 1),
    (v_q1, '10–25%', 'C', 2, 2),
    (v_q1, '26–40%', 'D', 1, 3),
    (v_q1, 'More than 40%', 'E', 0, 4);

  -- Q2 -- Personal Execution Dependency. tie_break_priority 13.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, how often do you personally complete work because doing it yourself feels faster or easier than getting someone else to own it?',
    'multiple_choice', true, 2, true, true,
    'Personal Execution Dependency',
    'You frequently absorb work yourself rather than transferring ownership elsewhere.',
    13
  )
  returning id into v_q2;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q2, 'Rarely or never', 'A', 4, 0),
    (v_q2, 'Once or twice', 'B', 3, 1),
    (v_q2, 'Several times', 'C', 2, 2),
    (v_q2, 'Most days', 'D', 1, 3),
    (v_q2, 'Multiple times a day', 'E', 0, 4);

  -- Q3 -- Scheduling Dependency. tie_break_priority 8.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'How much of the scheduling and calendar coordination surrounding your professional commitments still requires your personal involvement?',
    'multiple_choice', true, 3, true, true,
    'Scheduling Dependency',
    'A meaningful amount of scheduling and calendar coordination still requires your direct involvement.',
    8
  )
  returning id into v_q3;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q3, 'Almost none', 'A', 4, 0),
    (v_q3, 'A little', 'B', 3, 1),
    (v_q3, 'Some', 'C', 2, 2),
    (v_q3, 'A significant amount', 'D', 1, 3),
    (v_q3, 'Nearly all of it', 'E', 0, 4);

  -- Q4 -- Logistics Dependency. tie_break_priority 9.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, how often are you personally managing logistics surrounding meetings, travel, events or other professional commitments?',
    'multiple_choice', true, 4, true, true,
    'Logistics Dependency',
    'The logistics surrounding your professional commitments regularly require your personal involvement.',
    9
  )
  returning id into v_q4;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q4, 'Rarely or never', 'A', 4, 0),
    (v_q4, 'Once or twice', 'B', 3, 1),
    (v_q4, 'Several times', 'C', 2, 2),
    (v_q4, 'Most days', 'D', 1, 3),
    (v_q4, 'Multiple times a day', 'E', 0, 4);

  -- Q5 -- Follow-Through Dependency. tie_break_priority 1 (first in tie order).
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, how often are you personally responsible for making sure commitments, decisions or next steps get followed through to completion?',
    'multiple_choice', true, 5, true, true,
    'Follow-Through Dependency',
    'You are regularly responsible for making sure commitments, decisions and next steps move through to completion.',
    1
  )
  returning id into v_q5;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q5, 'Rarely or never', 'A', 4, 0),
    (v_q5, 'Once or twice', 'B', 3, 1),
    (v_q5, 'Several times', 'C', 2, 2),
    (v_q5, 'Most days', 'D', 1, 3),
    (v_q5, 'Multiple times a day', 'E', 0, 4);

  -- Q6 -- Information Dependency. tie_break_priority 6.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'How much of the information and context required to keep work moving lives primarily with you rather than with the appropriate people or systems?',
    'multiple_choice', true, 6, true, true,
    'Information Dependency',
    'Important information and context remain dependent on you to keep work moving.',
    6
  )
  returning id into v_q6;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q6, 'Very little — the right people and systems generally hold what they need', 'A', 4, 0),
    (v_q6, 'Some — I occasionally need to fill gaps', 'B', 3, 1),
    (v_q6, 'A meaningful amount — people regularly rely on me for context', 'C', 2, 2),
    (v_q6, 'A lot — I am a frequent hub for information and coordination', 'D', 1, 3),
    (v_q6, 'A great deal — important work would routinely lose context or momentum without me', 'E', 0, 4);

  -- Q7 -- Documentation Dependency. tie_break_priority 10.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'Approximately what percentage of recurring processes, workflows and ways of working are documented well enough for others to execute without relying on you?',
    'multiple_choice', true, 7, true, true,
    'Documentation Dependency',
    'Recurring work is not consistently documented well enough to move independently of you.',
    10
  )
  returning id into v_q7;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q7, '90% or more', 'A', 4, 0),
    (v_q7, '75–89%', 'B', 3, 1),
    (v_q7, '50–74%', 'C', 2, 2),
    (v_q7, '25–49%', 'D', 1, 3),
    (v_q7, 'Less than 25%', 'E', 0, 4);

  -- Q8 -- Decision Bottleneck. tie_break_priority 4.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, how often does meaningful work slow down or stop because a decision, approval or answer is waiting on you?',
    'multiple_choice', true, 8, true, true,
    'Decision Bottleneck',
    'Meaningful work regularly slows down or stops while waiting for your decision, approval or answer.',
    4
  )
  returning id into v_q8;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q8, 'Rarely or never', 'A', 4, 0),
    (v_q8, 'Once or twice', 'B', 3, 1),
    (v_q8, 'Several times', 'C', 2, 2),
    (v_q8, 'Most days', 'D', 1, 3),
    (v_q8, 'Multiple times a day', 'E', 0, 4);

  -- Q9 -- Unnecessary Decision Dependency. tie_break_priority 5.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'Of the decisions that reach you, how many genuinely require your judgment, authority or unique context?',
    'multiple_choice', true, 9, true, true,
    'Unnecessary Decision Dependency',
    'A meaningful share of the decisions reaching you do not require your judgment, authority or unique context.',
    5
  )
  returning id into v_q9;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q9, 'Nearly all', 'A', 4, 0),
    (v_q9, 'Most', 'B', 3, 1),
    (v_q9, 'About half', 'C', 2, 2),
    (v_q9, 'Some', 'D', 1, 3),
    (v_q9, 'Very few', 'E', 0, 4);

  -- Q10 -- Operational Dependency. tie_break_priority 2.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, how often are you pulled into operational issues that someone else could reasonably resolve without you?',
    'multiple_choice', true, 10, true, true,
    'Operational Dependency',
    'Operational issues that could be resolved elsewhere regularly require your involvement.',
    2
  )
  returning id into v_q10;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q10, 'Rarely or never', 'A', 4, 0),
    (v_q10, 'Once or twice', 'B', 3, 1),
    (v_q10, 'Several times', 'C', 2, 2),
    (v_q10, 'Most days', 'D', 1, 3),
    (v_q10, 'Multiple times a day', 'E', 0, 4);

  -- Q11 -- Context Question (Rock completion) -- unscored, dashboard-visible.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'Over the last two quarters, approximately what percentage of your organization''s major quarterly priorities or Rocks were completed as committed?',
    'multiple_choice', true, 11, false, true, null, null, null
  )
  returning id into v_q11;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q11, '90% or more', 'A', null, 0),
    (v_q11, '75–89%', 'B', null, 1),
    (v_q11, '60–74%', 'C', null, 2),
    (v_q11, '40–59%', 'D', null, 3),
    (v_q11, 'Less than 40%', 'E', null, 4);

  -- Q12 -- Highest-Value Capacity. tie_break_priority 3.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, approximately how much of your professional capacity is available for work where your specific contribution creates disproportionate value — vision, strategy, growth, innovation, key relationships or other work that truly requires you?',
    'multiple_choice', true, 12, true, true,
    'Highest-Value Capacity',
    'Too little of your professional capacity remains available for work where your specific contribution creates disproportionate value.',
    3
  )
  returning id into v_q12;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q12, 'More than 60%', 'A', 4, 0),
    (v_q12, '41–60%', 'B', 3, 1),
    (v_q12, '26–40%', 'C', 2, 2),
    (v_q12, '10–25%', 'D', 1, 3),
    (v_q12, 'Less than 10%', 'E', 0, 4);

  -- Q13 -- Low-Leverage Meeting Load. tie_break_priority 11.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'In a typical week, approximately how many hours do you spend in internal meetings primarily focused on status updates, coordination, planning or routine operating matters?',
    'multiple_choice', true, 13, true, true,
    'Low-Leverage Meeting Load',
    'A meaningful amount of your professional capacity is being consumed by internal status, coordination, planning or routine operating meetings.',
    11
  )
  returning id into v_q13;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q13, 'Less than 5 hours', 'A', 4, 0),
    (v_q13, '5–10 hours', 'B', 3, 1),
    (v_q13, '11–15 hours', 'C', 2, 2),
    (v_q13, '16–20 hours', 'D', 1, 3),
    (v_q13, 'More than 20 hours', 'E', 0, 4);

  -- Q14 -- Communication Dependency. tie_break_priority 12.
  insert into public.questions (assessment_id, prompt, type, required, sort_order, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (
    v_assessment_id,
    'How confident are you that important messages, requests and follow-ups reach your attention at the right time without requiring you to personally monitor your inbox and other communication channels?',
    'multiple_choice', true, 14, true, true,
    'Communication Dependency',
    'Staying on top of important messages, requests and follow-ups still depends heavily on your personal monitoring.',
    12
  )
  returning id into v_q14;

  insert into public.answer_options (question_id, label, value, score_value, sort_order) values
    (v_q14, 'Extremely confident', 'A', 4, 0),
    (v_q14, 'Very confident', 'B', 3, 1),
    (v_q14, 'Moderately confident', 'C', 2, 2),
    (v_q14, 'Slightly confident', 'D', 1, 3),
    (v_q14, 'Not at all confident', 'E', 0, 4);

  -- Profile thresholds -- min_score/max_score read as percentage bounds
  -- (the assessment_scoring_rules table already fits this shape directly).
  insert into public.assessment_scoring_rules (assessment_id, version, dimension, min_score, max_score, result_label, interpretation, sort_order, active) values
    (v_assessment_id, 1, 'overall_percentage', 75, 100, 'HIGH LEVERAGE',
     'Your operating environment is creating meaningful independence around you. Most work can move without your direct involvement, preserving substantial capacity for the contributions that require you.', 0, true),
    (v_assessment_id, 1, 'overall_percentage', 50, 74.99, 'CONSTRAINED LEVERAGE',
     'Meaningful dependencies are still consuming your capacity. Your operating environment creates leverage in some areas while execution, coordination, decisions or operational involvement continue to require your direct involvement.', 1, true),
    (v_assessment_id, 1, 'overall_percentage', 0, 49.99, 'INSUFFICIENT LEVERAGE',
     'Your current operating environment remains highly dependent on you. Significant work, movement or organizational context still relies on your direct involvement, limiting the capacity available for your highest-value contributions.', 2, true);
end $$;
