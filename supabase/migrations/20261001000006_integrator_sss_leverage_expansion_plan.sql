-- Two integrator modules from the dev guide addenda (verbatim copy):
--   * Start–Stop–Shift, integrator version (same shape as the visionary one,
--     different intro/helper/example/closing copy)
--   * Leverage Expansion Plan, the integrator counterpart of the
--     High-Leverage Handoff (same 11-screen flow; Screen 6 is a free-text
--     "Integrator Edge", different supporting-mechanism options and copy)
-- Both are integrator-audience modules. Like every newer module they are
-- selectable per session and are added to every EXISTING session's disabled
-- list so nothing changes for sessions already running.

do $$
declare
  v_max_sort integer;
begin
  select coalesce(max(sort_order), 0) into v_max_sort from public.modules;

  insert into public.modules (key, name, sort_order, active, audience) values
    ('start_stop_shift_integrator', 'Start–Stop–Shift (Integrator)', v_max_sort + 1, true, 'integrator'),
    ('leverage_expansion_plan', 'Leverage Expansion Plan', v_max_sort + 2, true, 'integrator')
  on conflict (key) do nothing;

  insert into public.structured_assessments (assessment_key, module_id, name)
  select m.key, m.id, m.name
  from public.modules m
  where m.key in ('start_stop_shift_integrator', 'leverage_expansion_plan')
  on conflict (assessment_key) do nothing;
end $$;

update public.sessions s
set disabled_module_keys = (
  select coalesce(array_agg(distinct k), '{}')
  from unnest(coalesce(s.disabled_module_keys, '{}') || array['start_stop_shift_integrator', 'leverage_expansion_plan']) as k
);

insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
select sa.id, 1, null, $cfg${
  "is_current": true,
  "intro": {
    "title": "Start–Stop–Shift",
    "body": [
      "What will you change in how you operate?",
      "Use what you've learned about your Integrator Edge, your executive partnership and the tools from today's workshop to identify specific changes you will make on your side of the partnership.",
      "Identify at least one commitment in each category. You may add additional commitments if they are meaningful.",
      "Your commitments should be specific and observable. Your executive should be able to tell whether you are doing them."
    ]
  },
  "categories": [
    {
      "id": "start", "label": "START",
      "prompt": "What will you begin doing that you are not doing consistently today?",
      "helper": "Identify a behavior or practice that will strengthen your judgment, ownership or ability to create leverage.",
      "field_prefix": "I will start...",
      "example": "When I escalate a decision, I will bring my recommendation rather than only presenting the issue."
    },
    {
      "id": "stop", "label": "STOP",
      "prompt": "What will you stop doing because it limits your ability to create leverage?",
      "helper": "Identify something you currently do that keeps you personally carrying complexity the partnership or system could handle differently.",
      "field_prefix": "I will stop...",
      "example": "I will stop absorbing new priorities without surfacing what will need to move or wait as a result."
    },
    {
      "id": "shift", "label": "SHIFT",
      "prompt": "What will you continue doing, but change how you do it?",
      "helper": "Identify a behavior or practice that still has value, but could create greater leverage if you evolved how you approach it.",
      "field_prefix": "I will shift...",
      "example": "I will shift from preparing my executive meeting by meeting to using a 7–14 day lookahead to anticipate what they will need to know, think about, do or have handled for them."
    }
  ],
  "review": {
    "title": "Your Start–Stop–Shift Commitments",
    "closing": "These are your commitments for how you will operate differently in the partnership. You will use them next as you build your Leverage Expansion Plan. You can return here at any time to reference these commitments or share them with your executive."
  }
}$cfg$::jsonb
from public.structured_assessments sa
where sa.assessment_key = 'start_stop_shift_integrator'
on conflict (assessment_id, version_number) do nothing;

insert into public.structured_assessment_versions (assessment_id, version_number, created_by, config)
select sa.id, 1, null, $cfg${
  "is_current": true,
  "intro": {
    "title": "Leverage Expansion Plan",
    "body": [
      "Choose one meaningful opportunity to expand the leverage you create for your executive over the next 90 days.",
      "This might mean taking greater ownership, exercising more judgment, anticipating a need earlier or strengthening a system so that more can move without requiring your executive’s direct involvement.",
      "Use the insights and tools you have already generated today to create a starting point you can bring back to your executive and refine together."
    ],
    "cta": "Build My Plan"
  },
  "steps": [
    {
      "id": "opportunity", "kind": "text", "title": "The Opportunity",
      "prompt": "Where are you ready to expand the leverage you create for your executive?",
      "helper": [
        "What do you want to be owning or handling differently 90 days from now?",
        "Look back at your EA Leverage & Orchestration Audit and consider where greater ownership, judgment or anticipation could meaningfully reduce what your executive needs to hold, drive, remember, decide or monitor."
      ],
      "example": "I own the readiness cycle for my executive’s external meetings so they enter each one prepared without personally chasing materials, assembling context or remembering what they need in advance."
    },
    {
      "id": "today", "kind": "text", "title": "Today",
      "prompt": "How does this work today?",
      "helper": ["Describe what you currently own or handle and where your executive is still involved in moving, deciding, remembering or monitoring this work."],
      "example": "I support meeting preparation when asked, but my executive still looks ahead at the calendar, identifies which meetings require preparation and initiates much of the process."
    },
    {
      "id": "shift90", "kind": "text", "title": "90-Day Shift",
      "prompt": "What will work differently 90 days from now?",
      "helper": ["Describe the shift you want to create in your ownership, judgment or approach and how the work will operate differently between you and your executive."],
      "example": "I proactively identify upcoming preparation needs, gather the necessary materials, protect preparation time and involve my executive only when an input or decision genuinely requires them."
    },
    {
      "id": "success", "kind": "text", "title": "Definition of Success",
      "prompt": "How will you know this expansion has been successful?",
      "helper": ["Describe the benefits you both experience when this is working successfully."],
      "example": "My executive can trust that meeting readiness is being managed without monitoring it, and consistently has what they need when it is time to prepare. I am able to get ahead of preparation needs instead of waiting for my executive to initiate the process."
    },
    {
      "id": "integratorEdge", "kind": "text", "title": "Integrator Edge",
      "prompt": "What aspect of your Integrator Edge will be most important to use intentionally as you expand your leverage here?",
      "helper": ["Consider both the advantage your wiring gives you and where you may need to exercise judgment or design around it."]
    },
    {
      "id": "commitments", "kind": "commitment_multi", "title": "Start–Stop–Shift Commitment",
      "prompt": "Which of your Start–Stop–Shift commitments will help this expansion succeed?",
      "helper": []
    },
    {
      "id": "mechanisms", "kind": "mechanism_multi", "title": "Supporting Mechanism",
      "prompt": "What tool or mechanism from today will help support this new way of working?",
      "helper": ["Select the mechanism you expect to use. You are identifying the tool, not designing it here."],
      "options": ["Trusted Tracker", "Prioritization Criteria", "72-Hour Window", "Tradeoff Facilitation", "Executive Readiness", "Pattern → Rule → Anticipation", "Escalation Criteria", "Decision Facilitation"]
    },
    {
      "id": "firstConversation", "kind": "text", "title": "First Conversation",
      "prompt": "What do you and your executive need to align on first?",
      "helper": ["Identify what you need to discuss or agree on together for you to expand your leverage successfully in this area."],
      "example": "Align on which meetings I will own readiness for, what “ready” means, what decisions I can make independently and where my executive still wants visibility or involvement."
    },
    {
      "id": "d30", "kind": "text", "title": "30 Days",
      "prompt": "What should be working differently within 30 days?",
      "helper": [],
      "example": "I am independently managing readiness for the agreed meeting categories, with my executive providing feedback where we still need to calibrate."
    },
    {
      "id": "d90", "kind": "text", "title": "90 Days",
      "prompt": "What does successful leverage look like at 90 days?",
      "helper": [],
      "example": "Meeting readiness operates proactively without my executive’s oversight, and I reliably involve them only when their judgment, input or authority is required.",
      "cta": "Complete My Plan"
    }
  ],
  "review": {
    "title": "Your Leverage Expansion Plan",
    "stick": { "label": "My Integrator Edge", "field": "integratorEdge" },
    "closing": [
      "Bring this plan back to your executive as the starting point for a conversation, rather than a finished plan.",
      "Share the opportunity you see, the commitment you are making on your side and the leverage you believe you can create. Invite your executive to help refine the plan based on what they need in order to give you greater ownership and where their visibility, input or authority still matters.",
      "As you put the plan into practice, work together to clarify the conditions that will support greater ownership, including the context and authority you need, the decisions you can make independently, what your executive wants visibility into and when something should escalate."
    ]
  }
}$cfg$::jsonb
from public.structured_assessments sa
where sa.assessment_key = 'leverage_expansion_plan'
on conflict (assessment_id, version_number) do nothing;
