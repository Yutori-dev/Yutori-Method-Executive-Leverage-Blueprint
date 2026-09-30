-- Visionary Thinking Traps Diagnostic, version 1, verbatim from the
-- developer implementation spec. Reuses the same question-capture shape as
-- EA Experience Assessment (all 40 items are single_select with the same
-- five-option scale) -- StructuredAssessmentFlow renders them unchanged.
-- Scoring/qualification (trap sums, threshold, tie-break, participant
-- result copy) lives in a `traps` array alongside `questions`, read only by
-- the scoring-specific submit action (not the generic one EA Experience
-- Assessment uses), and by the results view once complete.
insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
select
  sa.id,
  1,
  null,
  jsonb_build_object(
    'is_current', true,
    'intro', jsonb_build_object(
      'title', null,
      'body', jsonb_build_array(
        'Thinking about how you typically operate with the people who support you, indicate how often each statement describes you.',
        'Answer based on how you actually tend to show up, rather than how you would ideally like to operate.'
      )
    ),
    'completion_message', 'Your Visionary Thinking Traps are ready below.',
    'qualify_threshold', 8,
    'max_results', 3,
    -- Fixed tie-break priority order (highest priority first), verbatim
    -- from the spec section 7.
    'tie_break_order', jsonb_build_array(
      'OWNERSHIP', 'CONTROL', 'MIND_READING', 'URGENCY', 'SPEED',
      'CONTEXT', 'PERFECTION', 'CAPACITY', 'RESCUE', 'AVAILABILITY'
    ),
    'no_qualifying_result', jsonb_build_object(
      'title', 'No Dominant Thinking Trap Identified',
      'body', 'Your responses do not indicate a strong tendency toward any one of the thinking traps measured here. Use the individual patterns as prompts for reflection rather than treating any one of them as a dominant tendency.'
    ),
    'result_intro', jsonb_build_object(
      'title', 'Your Visionary Thinking Traps',
      'body', 'These are the thinking patterns most likely to shape how you show up with the people who support you. They are not fixed traits. They are patterns to notice so you can make more intentional choices about how you lead.'
    ),
    'traps', jsonb_build_array(
      jsonb_build_object(
        'id', 'SPEED', 'name', 'Speed Trap', 'statement', 'It will be faster if I just do it.',
        'question_ids', jsonb_build_array('q1', 'q11', 'q21', 'q31'),
        'trigger', 'Something needs to get done and doing it yourself feels faster than explaining, delegating or redirecting it.',
        'how_it_shows_up', 'You may absorb work, take tasks back or jump directly into execution when involving someone else feels inefficient.',
        'friction', 'The people around you have fewer opportunities to build ownership and you remain the easiest path for getting work done.',
        'shift', 'Treat the time required to transfer ownership as an investment in future capacity. Slow down long enough to create clarity once so you do not have to keep absorbing the work.'
      ),
      jsonb_build_object(
        'id', 'MIND_READING', 'name', 'Mind-Reading Trap', 'statement', 'They should already know what I mean or what good looks like.',
        'question_ids', jsonb_build_array('q2', 'q12', 'q22', 'q32'),
        'trigger', 'An expectation feels obvious to you or you assume someone who knows you well should understand what you want.',
        'how_it_shows_up', 'You may leave expectations, preferences or definitions of success unstated and become frustrated when someone interprets them differently.',
        'friction', 'The people supporting you have to infer what good looks like, increasing rework, hesitation and dependence on your reactions.',
        'shift', 'Make the implicit explicit. Define what matters, what good looks like and where judgment is welcome before the work begins.'
      ),
      jsonb_build_object(
        'id', 'CONTROL', 'name', 'Control Trap', 'statement', 'If I can''t see it, I can''t trust that it''s handled.',
        'question_ids', jsonb_build_array('q3', 'q13', 'q23', 'q33'),
        'trigger', 'Important work is happening outside your direct line of sight.',
        'how_it_shows_up', 'You may seek frequent updates, remain close to delegated work or re-enter execution to reassure yourself that things are moving.',
        'friction', 'Visibility becomes dependent on your involvement and the person holding the work has less room to operate independently.',
        'shift', 'Design visibility instead of creating it through involvement. Agree on what you need to see, when you need to see it and what should trigger active escalation.'
      ),
      jsonb_build_object(
        'id', 'PERFECTION', 'name', 'Perfection Trap', 'statement', 'Different from how I would do it means it''s not good enough.',
        'question_ids', jsonb_build_array('q4', 'q14', 'q24', 'q34'),
        'trigger', 'Someone produces a result or takes an approach that differs from how you would have done it.',
        'how_it_shows_up', 'You may revise, redirect or question work that meets the objective because the path or presentation differs from your own preference.',
        'friction', 'People learn to optimize for your personal method rather than exercising judgment against a clear outcome.',
        'shift', 'Separate preference from requirement. Define the outcome and non-negotiables, then allow room for a different path to a successful result.'
      ),
      jsonb_build_object(
        'id', 'URGENCY', 'name', 'Urgency Trap', 'statement', 'This feels important, so it needs attention now.',
        'question_ids', jsonb_build_array('q5', 'q15', 'q25', 'q35'),
        'trigger', 'A new idea, opportunity, problem or priority captures your attention.',
        'how_it_shows_up', 'You may shift focus quickly, introduce new priorities or expect action before explicitly reconciling the new priority with existing commitments.',
        'friction', 'The people around you have difficulty distinguishing genuine priority changes from the natural velocity of your thinking.',
        'shift', 'Signal the difference between an idea, an input and a priority. When something truly becomes a priority, explicitly identify what changes as a result.'
      ),
      jsonb_build_object(
        'id', 'RESCUE', 'name', 'Rescue Trap', 'statement', 'They''re struggling, so I''ll step in and fix it.',
        'question_ids', jsonb_build_array('q6', 'q16', 'q26', 'q36'),
        'trigger', 'Someone supporting you encounters difficulty, uncertainty or a problem you know how to solve.',
        'how_it_shows_up', 'You may provide the answer, take over the problem or become directly involved before the other person has had room to resolve it.',
        'friction', 'Your intervention solves the immediate issue while reinforcing dependence on you the next time something gets difficult.',
        'shift', 'Coach before rescuing. Ask what they see, what they recommend and what they need from you before deciding whether your involvement is necessary.'
      ),
      jsonb_build_object(
        'id', 'CONTEXT', 'name', 'Context Trap', 'statement', 'It''s easier for me to keep this in my head than explain all the context.',
        'question_ids', jsonb_build_array('q7', 'q17', 'q27', 'q37'),
        'trigger', 'You are moving quickly and sharing the surrounding context feels slower than simply holding it yourself.',
        'how_it_shows_up', 'Information, rationale and priorities remain in your head until someone needs them or asks the right question.',
        'friction', 'People cannot exercise strong judgment without the context you are using to make decisions, so work repeatedly returns to you.',
        'shift', 'Transfer context along with tasks. Share the why, relevant history, constraints and decision criteria that allow someone else to think with you rather than simply execute for you.'
      ),
      jsonb_build_object(
        'id', 'CAPACITY', 'name', 'Capacity Trap', 'statement', 'If it matters, we''ll find a way to fit it in.',
        'question_ids', jsonb_build_array('q8', 'q18', 'q28', 'q38'),
        'trigger', 'A new idea, opportunity, request or priority feels valuable enough to pursue.',
        'how_it_shows_up', 'You may add work based on its importance or potential without fully accounting for the capacity already committed around you.',
        'friction', 'The people supporting you can become overloaded, priorities compete for the same finite capacity and existing commitments may lose momentum without an explicit decision to deprioritize them.',
        'shift', 'Make capacity part of the prioritization decision. Before adding something, surface what is already being carried and decide what will move, wait, change or come off the list to create room.'
      ),
      jsonb_build_object(
        'id', 'AVAILABILITY', 'name', 'Availability Trap', 'statement', 'If I can answer it quickly, there''s no harm in them asking me.',
        'question_ids', jsonb_build_array('q9', 'q19', 'q29', 'q39'),
        'trigger', 'Someone brings you a question, request or issue that you can resolve quickly.',
        'how_it_shows_up', 'You remain readily available because answering feels efficient in the moment.',
        'friction', 'Your accessibility can become the operating system. Questions continue flowing to you because reaching you remains easier than developing another path.',
        'shift', 'Treat recurring questions as information about the system. Decide what can be answered elsewhere, turned into a decision rule or resolved without your involvement.'
      ),
      jsonb_build_object(
        'id', 'OWNERSHIP', 'name', 'Ownership Trap', 'statement', 'No one will care about this as much as I do.',
        'question_ids', jsonb_build_array('q10', 'q20', 'q30', 'q40'),
        'trigger', 'An outcome matters deeply to you and you feel personally accountable for its success.',
        'how_it_shows_up', 'You may stay close to work, retain responsibility or hesitate to fully transfer ownership because you doubt someone else will protect the outcome with the same intensity.',
        'friction', 'Your sense of responsibility can unintentionally prevent others from developing genuine ownership of the outcome.',
        'shift', 'Transfer accountability deliberately. Clarify the outcome, authority and definition of done, then evaluate ownership based on results rather than whether someone cares in exactly the same way you do.'
      )
    ),
    -- 40 items, fixed order, trap identity hidden from the participant
    -- (prompts are the bare statement text, no trap label). Every item
    -- shares the same five-option scale (internal 0-4) -- encoded as
    -- option LABELS here (single_select stores the label string, same as
    -- EA Experience Assessment), scored by mapping label -> value at
    -- submit time rather than storing numbers the UI would have to hide.
    'scale_values', jsonb_build_object('Never', 0, 'Rarely', 1, 'Sometimes', 2, 'Often', 3, 'Almost always', 4),
    'questions', (
      select jsonb_agg(
        jsonb_build_object(
          'id', 'q' || item.n, 'type', 'single_select', 'required', true,
          'prompt', item.prompt,
          'options', jsonb_build_array('Never', 'Rarely', 'Sometimes', 'Often', 'Almost always')
        ) order by item.n
      )
      from (values
        (1, 'When something needs to get done, I am inclined to handle it myself if I know I can complete it quickly.'),
        (2, 'I expect people who work closely with me to understand what I mean without needing me to explain every detail.'),
        (3, 'I feel more comfortable when I can see the details of work that someone else is handling.'),
        (4, 'When someone approaches work differently than I would, I can question whether their approach will produce the result I want.'),
        (5, 'When something feels important to me, I want it to receive attention quickly.'),
        (6, 'When someone supporting me is struggling with something, my instinct is to step in and help resolve it.'),
        (7, 'I tend to keep important context in my head until someone specifically asks me for it.'),
        (8, 'When I see an opportunity worth pursuing, I tend to focus more on its potential than on what would need to move or change to make room for it.'),
        (9, 'When someone asks me a question I can answer quickly, I tend to respond even if they could have figured it out without me.'),
        (10, 'I feel a stronger sense of personal responsibility for important outcomes than I expect other people to feel.'),
        (11, 'I tend to take work back when explaining or redirecting it feels more time-consuming than completing it myself.'),
        (12, 'I can become frustrated when someone does not pick up on expectations that feel obvious to me.'),
        (13, 'When I do not have visibility into something important, I can start to wonder whether it is being handled.'),
        (14, 'I notice when work does not match how I would have approached or structured it.'),
        (15, 'A new priority can quickly pull my attention away from work that was already underway.'),
        (16, 'When I see someone having difficulty, I am inclined to offer a solution rather than let them work through it independently.'),
        (17, 'People supporting me sometimes need information that I have not yet shared with them.'),
        (18, 'I can add work or priorities without fully accounting for what the people responsible for them are already carrying.'),
        (19, 'I make myself available for questions because answering them often feels easier than creating another process for handling them.'),
        (20, 'I can find it difficult to fully let go of something when the outcome matters deeply to me.'),
        (21, 'When I know exactly how I want something done, I am inclined to jump in rather than explain my thinking.'),
        (22, 'I expect people who know me well to anticipate how I will react to a situation.'),
        (23, 'I prefer frequent updates on work that is important to me.'),
        (24, 'I can have difficulty accepting an outcome that meets the objective but does not reflect how I would have done it.'),
        (25, 'When I become excited about something new, I can treat it as more immediately important than existing priorities.'),
        (26, 'I sometimes take responsibility for resolving an issue because I do not want someone else to struggle with it.'),
        (27, 'I can underestimate how much background information someone needs to make a good decision on my behalf.'),
        (28, 'When something feels important, I tend to assume we can find a way to fit it in alongside what is already underway.'),
        (29, 'I tend to remain accessible to people even when their questions interrupt work that requires my focus.'),
        (30, 'I can worry that other people will not protect an important outcome with the same level of attention that I would.'),
        (31, 'I am inclined to complete small tasks myself rather than hand them off.'),
        (32, 'I can assume that people understand my expectations even when I have not stated them explicitly.'),
        (33, 'I am more comfortable delegating when I have a way to check progress along the way.'),
        (34, 'I sometimes revise work that is already effective because I would have done it differently.'),
        (35, 'My sense of what deserves attention can shift quickly when a new idea or opportunity emerges.'),
        (36, 'When work starts to go off track, I am inclined to become directly involved in getting it back on course.'),
        (37, 'I sometimes assume people have more context about my priorities or thinking than I have actually given them.'),
        (38, 'I sometimes recognize that someone is overloaded only after their workload has started affecting execution.'),
        (39, 'I tend to answer questions as they arise rather than redirecting them to another person, process or resource.'),
        (40, 'I sometimes stay involved in work because I believe I will care more about the outcome than anyone else will.')
      ) as item(n, prompt)
    )
  )
from public.structured_assessments sa
where sa.assessment_key = 'thinking_traps'
on conflict (assessment_id, version_number) do nothing;
