-- EA Buffer Assessment (v2.0, Toledo Visionary Lab): a standalone,
-- visionary-audience module. Copy is verbatim from the dev guide. Like every
-- newer module it is selectable per session and is added to every EXISTING
-- session's disabled list so nothing changes for sessions already running.
-- It does not touch the EA Leverage Audit or the dyad logic.

do $$
declare
  v_max_sort integer;
begin
  select coalesce(max(sort_order), 0) into v_max_sort from public.modules;

  insert into public.modules (key, name, sort_order, active, audience) values
    ('ea_buffer_assessment', 'EA Buffer Assessment™', v_max_sort + 1, true, 'visionary')
  on conflict (key) do nothing;

  insert into public.structured_assessments (assessment_key, module_id, name)
  select m.key, m.id, m.name
  from public.modules m
  where m.key = 'ea_buffer_assessment'
  on conflict (assessment_key) do nothing;
end $$;

update public.sessions s
set disabled_module_keys = (
  select coalesce(array_agg(distinct k), '{}')
  from unnest(coalesce(s.disabled_module_keys, '{}') || array['ea_buffer_assessment']) as k
);

insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
select sa.id, 1, null, $cfg${
  "is_current": true,
  "version": 1,
  "rules": { "strongMin": 3, "developingMin": 2, "topN": 3 },
  "intro": {
    "title": "EA Buffer Assessment™",
    "body": [
      "Your executive assistant can create leverage by taking ownership of five essential functions: Capture, Hold, Sequence, Activate and Escalate.",
      "This assessment looks at how responsibility for these functions is currently distributed between you and your EA.",
      "You'll evaluate 20 responsibilities and receive a personalized snapshot showing where your Buffer is strongest and where greater EA ownership could create additional leverage."
    ],
    "cta": "Begin Assessment"
  },
  "contextQuestions": [
    {
      "id": "tenure",
      "prompt": "How long has your current EA been supporting you?",
      "options": [
        { "value": "lt3m", "label": "Less than 3 months" },
        { "value": "3to12m", "label": "3 to 12 months" },
        { "value": "1to2y", "label": "1 to 2 years" },
        { "value": "3to5y", "label": "3 to 5 years" },
        { "value": "gt5y", "label": "More than 5 years" },
        { "value": "none", "label": "I do not currently have an EA" }
      ],
      "exitOnValue": "none"
    },
    {
      "id": "capacity",
      "prompt": "Approximately what percentage of your EA's working capacity is dedicated to supporting you and your priorities?",
      "options": [
        { "value": "75_100", "label": "75–100%" },
        { "value": "50_74", "label": "50–74%" },
        { "value": "25_49", "label": "25–49%" },
        { "value": "lt25", "label": "Less than 25%" },
        { "value": "unsure", "label": "I'm not sure" }
      ]
    }
  ],
  "exitMessage": "This assessment is designed for executives who currently work with an EA. You can continue participating in the workshop without completing the assessment.",
  "scale": {
    "body": [
      "Think about how you and your EA currently work together.",
      "For each responsibility, select the level of ownership that best describes your working relationship today. Focus on what actually happens, rather than what you would ideally like to happen.",
      "Use the same five-point scale for all 20 questions."
    ],
    "cta": "Continue"
  },
  "questionPrompt": "Who currently owns this responsibility?",
  "ownershipLevels": [
    { "value": 0, "label": "I handle it", "description": "I manage this myself. My EA has little or no involvement." },
    { "value": 1, "label": "I direct it", "description": "My EA helps when I ask, but I initiate and direct the work." },
    { "value": 2, "label": "We share it", "description": "My EA and I both play an active role in managing this responsibility." },
    { "value": 3, "label": "My EA runs it", "description": "My EA manages this with limited involvement from me." },
    { "value": 4, "label": "My EA owns it", "description": "My EA takes full responsibility for this within agreed parameters, without requiring my involvement." }
  ],
  "functions": [
    {
      "id": "capture", "name": "Capture",
      "description": "Getting ideas, requests, information and commitments into a reliable system.",
      "responsibilities": [
        { "id": "C01", "name": "Ideas & Requests", "description": "Capturing ideas, requests and action items that arise in conversations or throughout the day" },
        { "id": "C02", "name": "Meeting Commitments", "description": "Recording decisions, commitments and next steps that emerge from meetings" },
        { "id": "C03", "name": "Incoming Communication", "description": "Identifying and capturing actionable requests and commitments from email, messages and other communication channels" },
        { "id": "C04", "name": "Information Intake", "description": "Collecting and organizing important information, documents and reference materials as they come in" }
      ]
    },
    {
      "id": "hold", "name": "Hold",
      "description": "Keeping track of what needs attention later, without requiring the executive to remember or monitor it.",
      "responsibilities": [
        { "id": "H01", "name": "Open Commitments", "description": "Maintaining a reliable record of outstanding commitments and follow-ups" },
        { "id": "H02", "name": "Pending Items", "description": "Tracking requests, decisions and other items awaiting responses or action from others" },
        { "id": "H03", "name": "Future Follow-Ups", "description": "Remembering and resurfacing items that require attention at a later date" },
        { "id": "H04", "name": "Work Visibility", "description": "Maintaining an up-to-date view of ongoing work and its current status" }
      ]
    },
    {
      "id": "sequence", "name": "Sequence",
      "description": "Managing priorities, time and competing demands so the right things happen in the right order.",
      "responsibilities": [
        { "id": "S01", "name": "Calendar & Time Protection", "description": "Managing the executive calendar, protecting time for priorities and minimizing unnecessary interruptions" },
        { "id": "S02", "name": "Priority Management", "description": "Organizing active priorities and determining which work receives attention" },
        { "id": "S03", "name": "Competing Demands", "description": "Resolving competing requests and commitments when priorities conflict" },
        { "id": "S04", "name": "Workload & Capacity", "description": "Identifying overcommitment and adjusting schedules or workloads to accommodate capacity constraints" }
      ]
    },
    {
      "id": "activate", "name": "Activate",
      "description": "Getting work moving and keeping it moving without requiring the executive's direct involvement.",
      "responsibilities": [
        { "id": "A01", "name": "Meeting Readiness", "description": "Preparing information, materials and other resources needed for upcoming meetings" },
        { "id": "A02", "name": "Commitment Follow-Through", "description": "Initiating and advancing actions required to fulfill commitments and next steps" },
        { "id": "A03", "name": "Project Coordination", "description": "Coordinating people, inputs, timelines and next steps for projects and initiatives" },
        { "id": "A04", "name": "Anticipatory Support", "description": "Identifying upcoming needs and taking appropriate action in advance" }
      ]
    },
    {
      "id": "escalate", "name": "Escalate",
      "description": "Recognizing what requires executive attention and bringing it forward at the right time, with the right context.",
      "responsibilities": [
        { "id": "E01", "name": "Issue Identification", "description": "Identifying problems, risks or unexpected developments that require executive involvement" },
        { "id": "E02", "name": "Timely Escalation", "description": "Bringing important issues to the executive's attention with sufficient time to respond" },
        { "id": "E03", "name": "Decision Preparation", "description": "Preparing decisions for executive review, including relevant context, options and tradeoffs" },
        { "id": "E04", "name": "Communication Filtering", "description": "Distinguishing between information requiring executive awareness, matters requiring action and items that can be handled independently" }
      ]
    }
  ],
  "classificationLabels": {
    "strong": "Strong Buffer",
    "developing": "Developing Buffer",
    "underdeveloped": "Underdeveloped Buffer"
  },
  "results": {
    "title": "Your EA Buffer Snapshot",
    "subtitle": "Where your Buffer is strongest — and where greater EA ownership could unlock more leverage.",
    "intro": "Your snapshot reflects how much ownership your EA currently carries across the five Buffer Functions. It highlights the parts of your Buffer that are well established and the areas where greater ownership could create additional leverage.",
    "headings": {
      "strongest": "Where Your Buffer Is Strongest",
      "needs": "Where Your Buffer Needs Strengthening",
      "opportunity": "Your Greatest Opportunity for Leverage"
    },
    "interpretations": {
      "capture": {
        "strong": "Your Capture function is strong, helping ensure ideas, requests and commitments enter a reliable system without depending on you to remember or record them.",
        "developing": "Your Capture function is developing. Some ideas, requests and commitments are captured independently, while others still require your involvement.",
        "underdeveloped": "Your Capture function is underdeveloped. You may still be carrying much of the responsibility for capturing incoming ideas, requests and commitments."
      },
      "hold": {
        "strong": "Your Hold function is strong, creating leverage by keeping outstanding work visible and ensuring important commitments resurface without requiring your attention.",
        "developing": "Your Hold function is developing. Some outstanding work is being tracked independently, while other commitments still require your monitoring or reminders.",
        "underdeveloped": "Your Hold function is underdeveloped. You may still be carrying much of the responsibility for remembering, monitoring and resurfacing outstanding work."
      },
      "sequence": {
        "strong": "Your Sequence function is strong, helping protect your time and keep priorities and competing demands organized without requiring your constant involvement.",
        "developing": "Your Sequence function is developing. Some priorities and scheduling decisions are managed independently, while others still require your direction.",
        "underdeveloped": "Your Sequence function is underdeveloped. You may still be heavily involved in managing priorities, resolving competing demands and determining how time and capacity are allocated."
      },
      "activate": {
        "strong": "Your Activate function is strong, creating leverage by allowing work to get started and keep moving without requiring you to initiate or coordinate every step.",
        "developing": "Your Activate function is developing. Some work moves forward independently, while other commitments and initiatives still depend on your involvement.",
        "underdeveloped": "Your Activate function is underdeveloped. You may still be the primary driver of action, follow-through and coordination across important work."
      },
      "escalate": {
        "strong": "Your Escalate function is strong, helping ensure that the right issues and decisions reach you at the right time, with appropriate context.",
        "developing": "Your Escalate function is developing. Some issues and decisions are brought forward appropriately, while others still depend on you to identify what requires your attention.",
        "underdeveloped": "Your Escalate function is underdeveloped. You may still be spending unnecessary time identifying what requires your involvement or gathering the information needed to make decisions."
      }
    },
    "allStrongFraming": "Your Buffer is already well established across all five functions. The opportunity is to keep strengthening it further."
  },
  "dashboard": {
    "completedSuffix": "assessments completed",
    "waiting": "Waiting for completed assessments",
    "sectionA": { "heading": "Buffer Strength Across the Cohort", "supporting": "Average EA ownership across the five Buffer Functions." },
    "sectionB": { "heading": "Where EA Ownership Is Creating Leverage", "supporting": "Responsibilities with the highest percentage of participants reporting EA-led ownership." },
    "sectionC": { "heading": "Where Executive Involvement Remains High", "supporting": "Responsibilities with the highest percentage of participants reporting continued executive involvement." }
  }
}$cfg$::jsonb
from public.structured_assessments sa
where sa.assessment_key = 'ea_buffer_assessment'
on conflict (assessment_id, version_number) do nothing;
