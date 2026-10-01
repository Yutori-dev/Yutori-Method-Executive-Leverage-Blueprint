-- High-Leverage Handoff, version 1, verbatim from the dev guide. Screens
-- 2-11 are one question each (Typeform-style); screens 6 and 7 are
-- populated at render time from the participant's own Thinking Traps
-- results and Start-Stop-Shift commitments, so their options are not stored
-- here. Screen 12 (the reference artifact) is rendered from the answers.
insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
select
  sa.id, 1, null,
  jsonb_build_object(
    'is_current', true,
    'intro', jsonb_build_object(
      'title', 'High-Leverage Handoff',
      'body', jsonb_build_array(
        'Choose one meaningful opportunity to change how something works between you and your EA over the next 90 days.',
        'This does not have to mean handing off a brand-new task. You might transfer greater ownership of something your EA already supports or introduce a mechanism that allows the partnership to operate with greater leverage.',
        'Use the insights and tools you have already generated today to create a starting point you can bring back to your EA and refine together.'
      ),
      'cta', 'Design My Handoff'
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('id','opportunity','kind','text','title','The Opportunity',
        'prompt','What is one thing you want your EA to take greater ownership over so that it no longer depends on you to move forward?',
        'helper', jsonb_build_array('What do you want your EA or your partnership to be handling differently 90 days from now?','Look back at your EA Leverage & Orchestration Audit and consider where greater ownership would meaningfully reduce what you need to hold, drive, remember, decide or monitor.'),
        'example','My EA owns the readiness cycle for my external meetings so I enter each one prepared without personally chasing materials, assembling context or remembering what I need in advance.'),
      jsonb_build_object('id','today','kind','text','title','Today',
        'prompt','What aspect of this are you still holding today?',
        'helper', jsonb_build_array('Describe what you currently need to hold, drive, remember, decide or monitor related to this opportunity.'),
        'example','I am still looking ahead at my calendar, identifying which meetings require preparation, requesting materials and checking whether everything is ready.'),
      jsonb_build_object('id','shift90','kind','text','title','90-Day Shift',
        'prompt','What will work differently 90 days from now?',
        'helper', jsonb_build_array('Describe the shift you want to create in how this responsibility or system operates between you and your EA.'),
        'example','My EA proactively identifies upcoming preparation needs, gathers the necessary materials, protects preparation time and involves me only when an input or decision genuinely requires me.'),
      jsonb_build_object('id','success','kind','text','title','Definition of Success',
        'prompt','How will you know that the handoff has been successful?',
        'helper', jsonb_build_array('Describe the benefits you both experience when this handoff is working successfully.'),
        'example','I can trust that meeting readiness is being managed without monitoring it myself, and I consistently have what I need when it is time to prepare. My EA Is able to get ahead of prep needs instead of having to scramble last minute.'),
      jsonb_build_object('id','trap','kind','trap_select','title','Thinking Trap',
        'prompt','Which Thinking Trap is most likely to pull you back into the old pattern?',
        'helper', jsonb_build_array()),
      jsonb_build_object('id','commitments','kind','commitment_multi','title','Start-Stop-Shift Commitment',
        'prompt','Which of your Start-Stop-Shift commitments will help this handoff succeed?',
        'helper', jsonb_build_array()),
      jsonb_build_object('id','mechanisms','kind','mechanism_multi','title','Supporting Mechanism',
        'prompt','What tool or mechanism from today will help support this new way of working?',
        'helper', jsonb_build_array('Select the mechanism you expect to use. You are identifying the tool, not designing it here.'),
        'options', jsonb_build_array('Tracker','Prioritization Criteria','Tradeoff Facilitation','Definition of Success','Decision Rights','Escalation Criteria','Decision Facilitation')),
      jsonb_build_object('id','firstConversation','kind','text','title','First Conversation',
        'prompt','What do you and your EA need to align on first?',
        'helper', jsonb_build_array('Identify what you need to discuss or agree on when you bring this handoff back to your EA.'),
        'example','Align on which meetings she will own readiness for, what "ready" means and what she needs from me to begin owning the process.'),
      jsonb_build_object('id','d30','kind','text','title','30 Days',
        'prompt','What should be working differently within 30 days?',
        'helper', jsonb_build_array(),
        'example','My EA is independently managing readiness for the agreed meeting categories, with me providing feedback where we still need to calibrate.'),
      jsonb_build_object('id','d90','kind','text','title','90 Days',
        'prompt','What does successful leverage look like at 90 days?',
        'helper', jsonb_build_array(),
        'example','Meeting readiness operates proactively without my oversight, and my EA reliably involves me only when my judgment, input or authority is required.',
        'cta','Complete My Handoff')
    ),
    'review', jsonb_build_object(
      'title', 'Your High-Leverage Handoff',
      'closing', jsonb_build_array(
        'Bring this handoff back to your EA as the starting point for a conversation, rather than a finished plan.',
        'Share the opportunity you see, the commitment you are making on your side and the shift you want to create. Invite your EA to help refine the handoff based on what they see and what they need to own it successfully.',
        'As you put the handoff into practice, the next step is to work together to clarify the guardrails around it, including the visibility you need, the decisions your EA can make independently, when something should escalate and any context, training or support they need to own it successfully.'
      )
    )
  )
from public.structured_assessments sa
where sa.assessment_key = 'high_leverage_handoff'
on conflict (assessment_id, version_number) do nothing;
