-- Start-Stop-Shift, version 1, verbatim from the developer implementation
-- spec's Dev Guide Addendum. Doesn't fit the single/multi-select/matrix
-- question engine the other modules use -- this is free-text commitment
-- lists (repeatable entries per category, no fixed question set) -- so its
-- config only holds copy, not a `questions` array, and it gets its own
-- capture component (StartStopShiftFlow) rather than
-- StructuredAssessmentFlow. Submissions still live in the same
-- structured_assessment_submissions table/answers column as every other
-- module: answers = {"start": [...], "stop": [...], "shift": [...]}.
insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
select
  sa.id,
  1,
  null,
  jsonb_build_object(
    'is_current', true,
    'intro', jsonb_build_object(
      'title', 'Start-Stop-Shift',
      'body', jsonb_build_array(
        'What will you change in how you show up?',
        'Use what you''ve learned about your Thinking Traps, your EA partnership and the tools from today''s workshop to identify specific changes you will make on your side of the partnership.',
        'Identify at least one commitment in each category. You may add additional commitments if they are meaningful.',
        'Your commitments should be specific and observable. Your EA should be able to tell whether you are doing them.'
      )
    ),
    'categories', jsonb_build_array(
      jsonb_build_object(
        'id', 'start', 'label', 'START',
        'prompt', 'What will you begin doing that you are not doing consistently today?',
        'helper', 'Identify a behavior or practice that will create better conditions for leverage.',
        'field_prefix', 'I will start...',
        'example', 'When I want a status update, I will check our tracker before asking my EA.'
      ),
      jsonb_build_object(
        'id', 'stop', 'label', 'STOP',
        'prompt', 'What will you stop doing because it undermines ownership, trust or leverage?',
        'helper', 'Identify something you currently do that reinforces dependency or gets in the way of your EA owning more.',
        'field_prefix', 'I will stop...',
        'example', 'I will stop labeling new work urgent unless it meets the urgency criteria we''ve agreed on.'
      ),
      jsonb_build_object(
        'id', 'shift', 'label', 'SHIFT',
        'prompt', 'What will you continue doing, but change how you do it?',
        'helper', 'Identify a behavior that still has value, but needs to evolve.',
        'field_prefix', 'I will shift...',
        'example', 'When I delegate, I will shift from describing the task to explicitly defining the outcome, Definition of Done and decision rights.'
      )
    ),
    'review', jsonb_build_object(
      'title', 'Your Start-Stop-Shift Commitments',
      'closing', 'These are your commitments for how you will show up differently in the partnership. You will use them next as you build your High-Leverage Handoff. You can return here at any time to reference these commitments or share them with your EA.'
    )
  )
from public.structured_assessments sa
where sa.assessment_key = 'start_stop_shift'
on conflict (assessment_id, version_number) do nothing;
