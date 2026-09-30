-- EA Experience Assessment, version 1, verbatim from the developer
-- implementation spec (client brief, module briefs 2026-09-30). This is the
-- expanded onboarding intake -- no scoring, no branching, available to a
-- participant immediately at first login (see Availability and Completion
-- Timing in the spec).
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
        'We''d like to learn a little about you and your experience before we meet in St. Louis.',
        'This brief assessment will help us understand the experience, strengths and development priorities represented in the room so we can tailor the Integrator Lab accordingly.',
        'Your individual responses to this assessment will not be shared with the Visionary you support. Other activities you complete as part of the workshop experience may be designed to generate shared insights or outputs, but the responses you provide here will remain separate. Please answer candidly based on your current experience and role. There are no right or wrong answers.'
      )
    ),
    'completion_message', 'Thank you. Your EA Experience Assessment is complete.',
    'questions', jsonb_build_array(
      jsonb_build_object('id', 'q1', 'type', 'short_text', 'prompt', 'What is your name?', 'required', true),
      jsonb_build_object('id', 'q2', 'type', 'email', 'prompt', 'What is your email address?', 'required', true),
      jsonb_build_object('id', 'q3', 'type', 'short_text', 'prompt', 'What is your current title?', 'required', true),
      jsonb_build_object(
        'id', 'q4', 'type', 'single_select', 'required', true,
        'prompt', 'How long have you worked in executive support roles across your career?',
        'options', jsonb_build_array('Less than 1 year', '1-2 years', '3-5 years', '6-10 years', '11-15 years', 'More than 15 years')
      ),
      jsonb_build_object(
        'id', 'q5', 'type', 'single_select', 'required', true,
        'prompt', 'How long have you supported your current executive?',
        'options', jsonb_build_array('Less than 6 months', '6-12 months', '1-2 years', '3-5 years', 'More than 5 years')
      ),
      jsonb_build_object(
        'id', 'q6', 'type', 'single_select', 'required', true,
        'prompt', 'Who do you primarily support?',
        'options', jsonb_build_array(
          'One executive', 'One primary executive plus limited support for others',
          'Multiple executives', 'Executive plus broader team or organizational responsibilities'
        )
      ),
      jsonb_build_object(
        'id', 'q7', 'type', 'single_select', 'required', true,
        'prompt', 'How much personal or household support is currently part of your role?',
        'options', jsonb_build_array(
          'None -- my role is focused entirely on professional/business support',
          'Limited -- I occasionally handle personal matters or logistics',
          'Moderate -- personal support is a recurring part of my responsibilities',
          'Significant -- I regularly manage both professional and personal responsibilities',
          'Extensive -- personal/household support represents a major part of my role'
        )
      ),
      jsonb_build_object(
        'id', 'q8', 'type', 'single_select', 'required', true,
        'prompt', 'Overall, how satisfied are you in your current role?',
        'options', jsonb_build_array('Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied')
      ),
      jsonb_build_object(
        'id', 'q9', 'type', 'single_select', 'required', true,
        'prompt', 'How would you describe your current capacity?',
        'options', jsonb_build_array(
          'I have meaningful excess capacity -- I consistently have room beyond my current responsibilities to take on additional work or expand my role.',
          'I have sufficient capacity -- I can perform my current role well and absorb normal fluctuations in demand without regularly making tradeoffs.',
          'I am operating near capacity -- I can meet my current responsibilities, but taking on something new generally requires deprioritizing something else.',
          'I am regularly over capacity -- I frequently struggle to fit current responsibilities within the time and energy available.',
          'My current workload feels unsustainable -- maintaining the current pace or scope is not realistic for me over time.'
        )
      ),
      jsonb_build_object(
        'id', 'q10', 'type', 'single_select', 'required', true,
        'prompt', 'Which statement best describes how you currently operate in your role?',
        'options', jsonb_build_array(
          'Primarily responsive execution -- I generally receive requests or direction from my executive and execute against them.',
          'Independent ownership of defined responsibilities -- I independently manage established areas of support and understand which responsibilities I own.',
          'Proactive orchestration around the executive -- I anticipate and coordinate across multiple areas around my executive, proactively connecting information, people, priorities and follow-through.',
          'Independent judgment and expanded ownership -- I regularly exercise judgment on my executive''s behalf, resolve issues without involving them and own outcomes beyond traditional executive support.',
          'Broader organizational leadership -- my role includes meaningful strategic, cross-functional or organizational leadership beyond supporting the executive.'
        )
      ),
      jsonb_build_object(
        'id', 'q11', 'type', 'matrix', 'required', true,
        'prompt', 'How confident are you in your ability to do each of the following effectively in your current role?',
        'options', jsonb_build_array('Not at all confident', 'Slightly confident', 'Moderately confident', 'Very confident', 'Extremely confident'),
        'rows', jsonb_build_array(
          jsonb_build_object('id', 'r1', 'label', 'Calendar management', 'description', 'strategically managing your executive''s calendar, time and scheduling demands'),
          jsonb_build_object('id', 'r2', 'label', 'Inbox and communication management', 'description', 'managing information flow, correspondence and follow-through'),
          jsonb_build_object('id', 'r3', 'label', 'Prioritization', 'description', 'helping distinguish what needs attention now from what can wait'),
          jsonb_build_object('id', 'r4', 'label', 'Capturing and closing loops', 'description', 'reliably tracking ideas, asks, commitments and follow-ups through completion'),
          jsonb_build_object('id', 'r5', 'label', 'Executive readiness', 'description', 'looking ahead and proactively ensuring your executive has the context, materials, preparation and protected capacity needed for what is coming'),
          jsonb_build_object('id', 'r6', 'label', 'Decision support', 'description', 'organizing context, options and recommendations to help your executive make decisions efficiently'),
          jsonb_build_object('id', 'r7', 'label', 'Navigating leadership dynamics', 'description', 'adapting effectively to your executive''s communication, working and leadership patterns'),
          jsonb_build_object('id', 'r8', 'label', 'Giving upward feedback', 'description', 'constructively sharing feedback, observations or concerns with your executive'),
          jsonb_build_object('id', 'r9', 'label', 'Influence without authority', 'description', 'moving work and stakeholders forward when you do not have formal authority'),
          jsonb_build_object('id', 'r10', 'label', 'Stakeholder mapping and management', 'description', 'understanding the broader ecosystem around your executive and using that context to manage their time, energy, attention and relationships effectively'),
          jsonb_build_object('id', 'r11', 'label', 'Creating systems and processes', 'description', 'turning recurring needs or patterns into repeatable ways of working')
        )
      ),
      jsonb_build_object(
        'id', 'q12', 'type', 'matrix', 'required', true,
        'prompt', 'How confident are you using AI for each of the following?',
        'options', jsonb_build_array('I don''t currently use AI for this', 'Beginner', 'Developing', 'Confident', 'Highly proficient'),
        'rows', jsonb_build_array(
          jsonb_build_object('id', 'r1', 'label', 'Drafting or refining emails and other short-form communication'),
          jsonb_build_object('id', 'r2', 'label', 'Researching, summarizing or synthesizing information'),
          jsonb_build_object('id', 'r3', 'label', 'Creating more substantial written deliverables, briefs or presentations'),
          jsonb_build_object('id', 'r4', 'label', 'Preparing for meetings, decisions or executive conversations'),
          jsonb_build_object('id', 'r5', 'label', 'Analyzing information to identify themes, patterns or insights'),
          jsonb_build_object('id', 'r6', 'label', 'Creating reusable prompts, templates or AI-assisted processes'),
          jsonb_build_object('id', 'r7', 'label', 'Building AI-powered workflows or automations that reduce recurring manual work')
        )
      ),
      jsonb_build_object(
        'id', 'q13', 'type', 'single_select', 'required', true,
        'prompt', 'How often do you currently use AI as part of your work?',
        'options', jsonb_build_array('Never', 'Less than once per week', 'A few times per week', 'Daily', 'Multiple times per day')
      ),
      jsonb_build_object(
        'id', 'q14', 'type', 'multi_select', 'required', true, 'min', 1, 'max', 5,
        'prompt', 'Where would additional coaching, tools or upskilling be most valuable to you right now?',
        'instruction', 'Select up to 5.',
        'otherOptionId', 'opt20', 'otherPrompt', 'Please specify:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'opt1', 'label', 'Strategic calendar and time management'),
          jsonb_build_object('id', 'opt2', 'label', 'Inbox and communication management'),
          jsonb_build_object('id', 'opt3', 'label', 'Prioritization and managing competing demands'),
          jsonb_build_object('id', 'opt4', 'label', 'Delegation and ownership'),
          jsonb_build_object('id', 'opt5', 'label', 'Executive preparation and readiness'),
          jsonb_build_object('id', 'opt6', 'label', 'Decision support and facilitation'),
          jsonb_build_object('id', 'opt7', 'label', 'Navigating a fast-moving or high-intensity executive'),
          jsonb_build_object('id', 'opt8', 'label', 'Navigating the interpersonal dynamics of my specific executive partnership'),
          jsonb_build_object('id', 'opt9', 'label', 'Communicating effectively with my executive'),
          jsonb_build_object('id', 'opt10', 'label', 'Giving and receiving feedback'),
          jsonb_build_object('id', 'opt11', 'label', 'Influence without authority'),
          jsonb_build_object('id', 'opt12', 'label', 'Stakeholder mapping and management'),
          jsonb_build_object('id', 'opt13', 'label', 'Becoming more proactive'),
          jsonb_build_object('id', 'opt14', 'label', 'Creating systems, SOPs and repeatable workflows'),
          jsonb_build_object('id', 'opt15', 'label', 'Using AI more effectively in my day-to-day work'),
          jsonb_build_object('id', 'opt16', 'label', 'Building AI-powered workflows and automations'),
          jsonb_build_object('id', 'opt17', 'label', 'Expanding my role or operating at a higher level'),
          jsonb_build_object('id', 'opt18', 'label', 'Managing workload and boundaries'),
          jsonb_build_object('id', 'opt19', 'label', 'Preventing burnout and managing stress in a high-intensity role'),
          jsonb_build_object('id', 'opt20', 'label', 'Other')
        )
      ),
      jsonb_build_object('id', 'q15', 'type', 'short_text', 'required', true,
        'prompt', 'What''s one thing you could change over the next six months that would have the biggest positive impact on the effectiveness of your relationship with your executive?'),
      jsonb_build_object('id', 'q16', 'type', 'short_text', 'required', false,
        'prompt', 'What is the biggest challenge you currently experience in supporting and working effectively with your executive?'),
      jsonb_build_object(
        'id', 'q17', 'type', 'single_select', 'required', true,
        'prompt', 'How comfortable are you constructively pushing back or expressing a different point of view with your executive?',
        'options', jsonb_build_array('Not at all comfortable', 'Slightly comfortable', 'Moderately comfortable', 'Very comfortable', 'Extremely comfortable')
      )
    )
  )
from public.structured_assessments sa
where sa.assessment_key = 'ea_experience_assessment'
on conflict (assessment_id, version_number) do nothing;
