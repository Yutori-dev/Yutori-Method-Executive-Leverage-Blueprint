-- Executive Leverage Diagnostic v2: corrected response-option wording only.
-- Question count, prompts, scoring, thresholds, constraint labels, and
-- tie-break priorities are unchanged (already matched the client's spec
-- exactly, verified live against the V1 developer implementation spec) --
-- only the option label text for the Baseline question and 8 scored
-- questions (2,3,4,5,6,8,9,10) is corrected to the exact wording supplied.
-- Deactivates v1, activates v2, matching the app's "new version, never
-- mutate" content pattern.

update public.assessments set active = false where id = '2337efe7-410e-4401-8dff-407ada510557';

insert into public.assessments (key, name, version, active, is_placeholder)
values ('executive_leverage_diagnostic', 'Executive Leverage Diagnostic™', 2, true, false);

do $$
declare
  v_assessment_id uuid;
  v_question_id uuid;
  v_q0_id uuid;
  v_q1_id uuid;
  v_q2_id uuid;
  v_q3_id uuid;
  v_q4_id uuid;
  v_q5_id uuid;
  v_q6_id uuid;
  v_q7_id uuid;
  v_q8_id uuid;
  v_q9_id uuid;
  v_q10_id uuid;
  v_q11_id uuid;
  v_q12_id uuid;
  v_q13_id uuid;
  v_q14_id uuid;
begin
  select id into v_assessment_id from public.assessments where key = 'executive_leverage_diagnostic' and version = 2;

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 0, 'Thinking across your life as a whole, how would you describe your current capacity?', 'multiple_choice', true, true, false, true, null, null, null)
  returning id into v_q0_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q0_id, 'I have enough capacity for the things that matter most to me, with room for the unexpected.', 'A', null, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q0_id, 'I have enough capacity for my important commitments, but unexpected demands can create temporary pressure.', 'B', null, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q0_id, 'I can cover my important commitments, but only by making deliberate tradeoffs between them.', 'C', null, 2, true, '{"capacity_pressure":true}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q0_id, 'Some important commitments regularly receive less time, attention or energy than I want to give them.', 'D', null, 3, true, '{"capacity_pressure":true}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q0_id, 'Important commitments are regularly being deferred, neglected or sacrificed because I do not have sufficient capacity.', 'E', null, 4, true, '{"capacity_pressure":true}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 1, 'In a typical week, how much of your professional time is spent personally completing administrative, coordination or routine execution work?', 'multiple_choice', true, true, true, true, 'Execution Burden', 'A meaningful amount of your professional capacity is being consumed by administrative, coordination or routine execution work.', 7)
  returning id into v_q1_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q1_id, 'Very little or none', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q1_id, 'Less than 10%', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q1_id, '10–25%', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q1_id, '26–40%', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q1_id, 'More than 40%', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 2, 'In a typical week, how often do you personally complete work because doing it yourself feels faster or easier than getting someone else to own it?', 'multiple_choice', true, true, true, true, 'Personal Execution Dependency', 'You frequently absorb work yourself rather than transferring ownership elsewhere.', 13)
  returning id into v_q2_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q2_id, 'Rarely or never', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q2_id, 'Once or twice in a typical week', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q2_id, 'Three or four times in a typical week', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q2_id, 'About once per day', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q2_id, 'Multiple times per day', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 3, 'How much of the scheduling and calendar coordination surrounding your professional commitments still requires your personal involvement?', 'multiple_choice', true, true, true, true, 'Scheduling Dependency', 'A meaningful amount of scheduling and calendar coordination still requires your direct involvement.', 8)
  returning id into v_q3_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q3_id, 'Almost none — others handle scheduling and coordination without my involvement', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q3_id, 'Limited — I occasionally get involved in exceptions or unusual scheduling needs', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q3_id, 'Moderate — I regularly participate in scheduling or calendar decisions', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q3_id, 'Substantial — I personally manage many scheduling decisions or changes', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q3_id, 'Nearly all — scheduling and calendar coordination depend primarily on me', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 4, 'In a typical week, how often are you personally managing logistics surrounding meetings, travel, events or other professional commitments?', 'multiple_choice', true, true, true, true, 'Logistics Dependency', 'The logistics surrounding your professional commitments regularly require your personal involvement.', 9)
  returning id into v_q4_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q4_id, 'Rarely or never', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q4_id, 'Once or twice in a typical week', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q4_id, 'Three or four times in a typical week', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q4_id, 'About once per day', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q4_id, 'Multiple times per day', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 5, 'In a typical week, how often are you personally responsible for making sure commitments, decisions or next steps get followed through to completion?', 'multiple_choice', true, true, true, true, 'Follow-Through Dependency', 'You are regularly responsible for making sure commitments, decisions and next steps move through to completion.', 1)
  returning id into v_q5_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q5_id, 'Rarely or never', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q5_id, 'Once or twice in a typical week', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q5_id, 'Three or four times in a typical week', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q5_id, 'About once per day', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q5_id, 'Multiple times per day', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 6, 'How much of the information and context required to keep work moving lives primarily with you rather than with the appropriate people or systems?', 'multiple_choice', true, true, true, true, 'Information Dependency', 'Important information and context remain dependent on you to keep work moving.', 6)
  returning id into v_q6_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q6_id, 'Very little — the right people and systems generally have what they need', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q6_id, 'Limited — I occasionally need to provide missing context', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q6_id, 'Moderate — people regularly come to me for information or context they cannot access elsewhere', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q6_id, 'Substantial — I am frequently needed to connect information, people or decisions', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q6_id, 'Extensive — important work routinely loses context or momentum without my involvement', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 7, 'Approximately what percentage of recurring processes, workflows and ways of working are documented well enough for others to execute without relying on you?', 'multiple_choice', true, true, true, true, 'Documentation Dependency', 'Recurring work is not consistently documented well enough to move independently of you.', 10)
  returning id into v_q7_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q7_id, '90% or more', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q7_id, '75–89%', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q7_id, '50–74%', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q7_id, '25–49%', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q7_id, 'Less than 25%', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 8, 'In a typical week, how often does meaningful work slow down or stop because a decision, approval or answer is waiting on you?', 'multiple_choice', true, true, true, true, 'Decision Bottleneck', 'Meaningful work regularly slows down or stops while waiting for your decision, approval or answer.', 4)
  returning id into v_q8_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q8_id, 'Rarely or never', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q8_id, 'Once or twice in a typical week', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q8_id, 'Three or four times in a typical week', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q8_id, 'About once per day', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q8_id, 'Multiple times per day', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 9, 'Of the decisions that reach you, how many genuinely require your judgment, authority or unique context?', 'multiple_choice', true, true, true, true, 'Unnecessary Decision Dependency', 'A meaningful share of the decisions reaching you do not require your judgment, authority or unique context.', 5)
  returning id into v_q9_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q9_id, 'More than 90%', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q9_id, '71–90%', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q9_id, '41–70%', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q9_id, '21–40%', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q9_id, '20% or less', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 10, 'In a typical week, how often are you pulled into operational issues that someone else could reasonably resolve without you?', 'multiple_choice', true, true, true, true, 'Operational Dependency', 'Operational issues that could be resolved elsewhere regularly require your involvement.', 2)
  returning id into v_q10_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q10_id, 'Rarely or never', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q10_id, 'Once or twice in a typical week', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q10_id, 'Three or four times in a typical week', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q10_id, 'About once per day', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q10_id, 'Multiple times per day', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 11, 'Over the last two quarters, approximately what percentage of your organization''s major quarterly priorities or Rocks were completed as committed?', 'multiple_choice', true, true, false, true, null, null, null)
  returning id into v_q11_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q11_id, '90% or more', 'A', null, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q11_id, '75–89%', 'B', null, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q11_id, '60–74%', 'C', null, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q11_id, '40–59%', 'D', null, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q11_id, 'Less than 40%', 'E', null, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 12, 'In a typical week, approximately how much of your professional capacity is available for work where your specific contribution creates disproportionate value — vision, strategy, growth, innovation, key relationships or other work that truly requires you?', 'multiple_choice', true, true, true, true, 'Highest-Value Capacity', 'Too little of your professional capacity remains available for work where your specific contribution creates disproportionate value.', 3)
  returning id into v_q12_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q12_id, 'More than 60%', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q12_id, '41–60%', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q12_id, '26–40%', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q12_id, '10–25%', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q12_id, 'Less than 10%', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 13, 'In a typical week, approximately how many hours do you spend in internal meetings primarily focused on status updates, coordination, planning or routine operating matters?', 'multiple_choice', true, true, true, true, 'Low-Leverage Meeting Load', 'A meaningful amount of your professional capacity is being consumed by internal status, coordination, planning or routine operating meetings.', 11)
  returning id into v_q13_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q13_id, 'Less than 5 hours', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q13_id, '5–10 hours', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q13_id, '11–15 hours', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q13_id, '16–20 hours', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q13_id, 'More than 20 hours', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.questions (assessment_id, sort_order, prompt, type, required, active, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority)
  values (v_assessment_id, 14, 'How confident are you that important messages, requests and follow-ups reach your attention at the right time without requiring you to personally monitor your inbox and other communication channels?', 'multiple_choice', true, true, true, true, 'Communication Dependency', 'Staying on top of important messages, requests and follow-ups still depends heavily on your personal monitoring.', 12)
  returning id into v_q14_id;

  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q14_id, 'Extremely confident', 'A', 4, 0, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q14_id, 'Very confident', 'B', 3, 1, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q14_id, 'Moderately confident', 'C', 2, 2, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q14_id, 'Slightly confident', 'D', 1, 3, true, '{}'::jsonb);
  insert into public.answer_options (question_id, label, value, score_value, sort_order, active, metadata)
  values (v_q14_id, 'Not at all confident', 'E', 0, 4, true, '{}'::jsonb);

  insert into public.assessment_scoring_rules (assessment_id, version, dimension, min_score, max_score, result_label, interpretation, sort_order, active)
  values (v_assessment_id, 2, 'overall_percentage', 75, 100, 'HIGH LEVERAGE', 'Your operating environment is creating meaningful independence around you. Most work can move without your direct involvement, preserving substantial capacity for the contributions that require you.', 0, true);
  insert into public.assessment_scoring_rules (assessment_id, version, dimension, min_score, max_score, result_label, interpretation, sort_order, active)
  values (v_assessment_id, 2, 'overall_percentage', 50, 74.99, 'CONSTRAINED LEVERAGE', 'Meaningful dependencies are still consuming your capacity. Your operating environment creates leverage in some areas while execution, coordination, decisions or operational involvement continue to require your direct involvement.', 1, true);
  insert into public.assessment_scoring_rules (assessment_id, version, dimension, min_score, max_score, result_label, interpretation, sort_order, active)
  values (v_assessment_id, 2, 'overall_percentage', 0, 49.99, 'INSUFFICIENT LEVERAGE', 'Your current operating environment remains highly dependent on you. Significant work, movement or organizational context still relies on your direct involvement, limiting the capacity available for your highest-value contributions.', 2, true);
end $$;
