-- Executive Support Audit (Section 4 / "leverage" module, client V1 spec).
-- Was completely unbuilt -- a literal [YUTORI CONTENT PENDING] placeholder
-- card. 12-question single-select forced-choice, one question per screen,
-- auto-advance on selection, four leverage layers (reusing the same
-- execution/orchestration/strategic/systems vocabulary already used by
-- responsibilities.leverage_level elsewhere in this schema).

create table public.executive_support_audit_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  active boolean not null default true,
  intro_header text not null,
  intro_subheader text not null,
  intro_body text not null,
  results_intro_copy text not null,
  execution_primary_copy text not null,
  orchestration_primary_copy text not null,
  strategic_primary_copy text not null,
  systems_primary_copy text not null,
  execution_secondary_copy text not null,
  orchestration_secondary_copy text not null,
  strategic_secondary_copy text not null,
  systems_secondary_copy text not null,
  no_secondary_copy text not null,
  secondary_threshold integer not null default 3,
  created_at timestamptz not null default now()
);

alter table public.executive_support_audit_config enable row level security;

create policy "authenticated can read executive support audit config"
  on public.executive_support_audit_config for select
  using (auth.uid() is not null);

create policy "admins write executive support audit config"
  on public.executive_support_audit_config for all
  using (public.is_admin())
  with check (public.is_admin());

create table public.executive_support_audit_questions (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references public.executive_support_audit_config (id) on delete cascade,
  sort_order integer not null,
  prompt text not null,
  option_execution text not null,
  option_orchestration text not null,
  option_strategic text not null,
  option_systems text not null,
  active boolean not null default true
);

create index executive_support_audit_questions_config_id_idx on public.executive_support_audit_questions (config_id);

alter table public.executive_support_audit_questions enable row level security;

create policy "authenticated can read executive support audit questions"
  on public.executive_support_audit_questions for select
  using (auth.uid() is not null);

create policy "admins write executive support audit questions"
  on public.executive_support_audit_questions for all
  using (public.is_admin())
  with check (public.is_admin());

create table public.executive_support_audit_responses (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  question_id uuid not null references public.executive_support_audit_questions (id) on delete restrict,
  selected_layer text not null check (selected_layer in ('execution', 'orchestration', 'strategic', 'systems')),
  created_at timestamptz not null default now(),
  unique (participant_session_id, question_id)
);

create index executive_support_audit_responses_ps_idx on public.executive_support_audit_responses (participant_session_id);

alter table public.executive_support_audit_responses enable row level security;

create policy "participants read own executive support audit responses"
  on public.executive_support_audit_responses for select
  using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = executive_support_audit_responses.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy "admins read all executive support audit responses"
  on public.executive_support_audit_responses for select
  using (public.is_admin());

create table public.executive_support_audit_results (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null unique references public.participant_sessions (id) on delete cascade,
  config_id uuid not null references public.executive_support_audit_config (id),
  execution_score integer not null,
  orchestration_score integer not null,
  strategic_score integer not null,
  systems_score integer not null,
  primary_layers text[] not null,
  secondary_layers text[] not null default '{}',
  calculated_at timestamptz not null default now()
);

alter table public.executive_support_audit_results enable row level security;

create policy "participants read own executive support audit results"
  on public.executive_support_audit_results for select
  using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = executive_support_audit_results.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy "admins read all executive support audit results"
  on public.executive_support_audit_results for select
  using (public.is_admin());

-- Real content, exact wording from the client's V1 spec.
insert into public.executive_support_audit_config (
  version, active, intro_header, intro_subheader, intro_body, results_intro_copy,
  execution_primary_copy, orchestration_primary_copy, strategic_primary_copy, systems_primary_copy,
  execution_secondary_copy, orchestration_secondary_copy, strategic_secondary_copy, systems_secondary_copy,
  no_secondary_copy, secondary_threshold
) values (
  1, true,
  'EXECUTIVE SUPPORT AUDIT',
  'Where Is Your Leadership Infrastructure Breaking Down?',
  'For each question, select the option that best reflects your current reality or the situation that creates the most friction.',
  'Your responses surfaced the following patterns in where executive leverage may be constrained today.',
  'Your responses suggest that defined execution work may be consuming more leadership capacity than it should. Administrative, logistical or repeatable responsibilities may still depend too heavily on senior-level attention, leaving less capacity available for work where executive involvement creates greater value.',
  'Your responses suggest that too much of the coordination around you may still depend on you. Information, priorities, commitments and follow-through may require more of your attention than they should, keeping you central to activity that could increasingly move without your involvement.',
  'Your responses suggest that important work may remain too dependent on your judgment, authority or continued involvement. Consequential decisions, strategic tradeoffs or organizational priorities may have difficulty advancing without you remaining closely engaged.',
  'Your responses suggest that human capacity may be absorbing work that better systems could increasingly carry. Manual workflows, fragmented information or underutilized AI and automation may be limiting how much capacity your existing team can create.',
  'A secondary pattern also appears around Execution Leverage. Defined, repeatable or administrative work may still be consuming capacity that could be redirected elsewhere.',
  'A secondary pattern also appears around Orchestration Leverage. Coordination, information flow or follow-through may still require more executive involvement than your broader support environment should demand.',
  'A secondary pattern also appears around Strategic Leverage. Some consequential work may still depend on executive judgment or authority that could potentially be distributed more broadly.',
  'A secondary pattern also appears around Systems Leverage. There may be additional capacity available through stronger systems, AI or automation that your current environment is not yet capturing.',
  'Your responses point predominantly toward a single leverage gap rather than a meaningful secondary pattern.',
  3
);

do $$
declare
  v_config_id uuid;
begin
  select id into v_config_id from public.executive_support_audit_config where version = 1 and active = true;

  insert into public.executive_support_audit_questions (config_id, sort_order, prompt, option_execution, option_orchestration, option_strategic, option_systems) values
  (v_config_id, 1, 'When you look at your calendar, what frustrates you most?',
    'Too many administrative and logistical tasks still require my involvement.',
    'My time is not consistently organized around my highest priorities.',
    'Too many consequential meetings or decisions still depend on me personally.',
    'Too much calendar management and preparation still relies on manual human effort.'),
  (v_config_id, 2, 'When projects stall, the most common reason is:',
    'Defined tasks and follow-ups aren''t executed reliably enough.',
    'Coordination across people, information and commitments breaks down.',
    'No one has sufficient authority or judgment to move the work forward.',
    'Too much of the workflow depends on manual handoffs and human follow-through.'),
  (v_config_id, 3, 'What most often pulls you out of your highest-value work?',
    'Administrative or logistical tasks that need my attention.',
    'Coordinating information, people, priorities or follow-through.',
    'Making decisions or resolving strategic issues that no one else is equipped or empowered to own.',
    'Work that could be absorbed or accelerated through AI and automation.'),
  (v_config_id, 4, 'Which scenario feels most familiar?',
    'I still personally handle defined work that could be reliably executed elsewhere.',
    'I remain the central hub for too much information and coordination.',
    'Important priorities depend on me to maintain direction and momentum.',
    'Recurring work still depends on people when technology could absorb more of it.'),
  (v_config_id, 5, 'What most often creates unnecessary friction in your day?',
    'Administrative or logistical work competing for my attention.',
    'Information, communication and commitments that require me to coordinate them.',
    'Strategic decisions and tradeoffs that repeatedly return to me.',
    'Manual or repetitive work that could be streamlined through AI or automation.'),
  (v_config_id, 6, 'When something falls through the cracks, it''s usually because:',
    'The task wasn''t executed reliably.',
    'Coordination or follow-through broke down.',
    'Ownership or decision authority wasn''t sufficient to move it forward.',
    'The workflow depended too heavily on people remembering what needed to happen.'),
  (v_config_id, 7, 'If you step away for a few days, what are you most concerned about?',
    'Administrative or logistical work piling up.',
    'Information, commitments or follow-through becoming difficult to coordinate.',
    'Important priorities losing direction or momentum without my judgment.',
    'Recurring workflows breaking down because they still depend too heavily on human intervention.'),
  (v_config_id, 8, 'Which leadership frustration resonates most?',
    'I spend too much time on work someone else could reliably execute.',
    'Too much coordination still depends on me.',
    'Too many consequential decisions or priorities still require my direct involvement.',
    'We aren''t using AI and automation aggressively enough to reduce manual work.'),
  (v_config_id, 9, 'When you think about scaling the organization, the biggest concern is:',
    'The growing volume of work requiring human execution.',
    'The growing complexity of coordinating people, information and priorities.',
    'The growing number of consequential priorities and decisions requiring senior judgment and authority.',
    'Our ability to use AI, automation and systems to expand capacity without adding equivalent human effort.'),
  (v_config_id, 10, 'When someone asks for an update on an important initiative, you often need to:',
    'Check whether the underlying tasks were completed.',
    'Piece together information from multiple people or places.',
    'Get involved to assess direction, resolve a tradeoff or determine what happens next.',
    'Manually reconstruct information that our systems should already make visible.'),
  (v_config_id, 11, 'Which pattern shows up most frequently?',
    'Senior people spend too much time executing work that could sit elsewhere.',
    'Executives remain too central to coordination and information flow.',
    'Important work remains too dependent on executive judgment and authority.',
    'Human effort is being used for work that technology could absorb or accelerate.'),
  (v_config_id, 12, 'If you could eliminate one type of friction tomorrow, it would be:',
    'Defined execution work consuming leadership capacity.',
    'Coordination and information flow consuming leadership capacity.',
    'Strategic decisions and priorities remaining dependent on my involvement.',
    'Manual work that AI, automation or better systems could absorb.');
end $$;

-- save_executive_support_audit_response: own-session, per-question autosave.
create or replace function public.save_executive_support_audit_response(
  p_participant_session_id uuid,
  p_question_id uuid,
  p_selected_layer text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  if not public.is_module_unlocked_for_session(v_session_id, 'leverage') then
    raise exception 'The Executive Support Audit is not yet unlocked.';
  end if;

  if p_selected_layer not in ('execution', 'orchestration', 'strategic', 'systems') then
    raise exception 'Invalid response.';
  end if;

  insert into public.executive_support_audit_responses (participant_session_id, question_id, selected_layer)
  values (p_participant_session_id, p_question_id, p_selected_layer)
  on conflict (participant_session_id, question_id) do update set selected_layer = excluded.selected_layer;
end;
$$;

-- calculate_executive_support_audit_results: tallies the 4 layer scores,
-- determines Primary (highest, ties all included per spec section 5) and
-- Secondary (only when a single Primary exists, next-highest excluding
-- Primary, ties included, only if score >= threshold, per spec section 6).
create or replace function public.calculate_executive_support_audit_results(p_participant_session_id uuid)
returns public.executive_support_audit_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config_id uuid;
  v_total_questions integer;
  v_answered_count integer;
  v_execution integer;
  v_orchestration integer;
  v_strategic integer;
  v_systems integer;
  v_max_score integer;
  v_primary text[] := '{}';
  v_secondary text[] := '{}';
  v_second_max integer;
  v_threshold integer;
  v_row public.executive_support_audit_results;
begin
  if not exists (
    select 1 from public.participant_sessions
    where id = p_participant_session_id and participant_id = auth.uid()
  ) then
    raise exception 'Not authorized for this participant session.';
  end if;

  select id, secondary_threshold into v_config_id, v_threshold
  from public.executive_support_audit_config where active = true order by version desc limit 1;

  select count(*) into v_total_questions
  from public.executive_support_audit_questions where config_id = v_config_id and active = true;

  select count(*) into v_answered_count
  from public.executive_support_audit_responses r
  join public.executive_support_audit_questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id and q.config_id = v_config_id and q.active = true;

  if v_answered_count < v_total_questions then
    raise exception 'All questions must be answered before scoring (% of %).', v_answered_count, v_total_questions;
  end if;

  select count(*) filter (where selected_layer = 'execution'),
         count(*) filter (where selected_layer = 'orchestration'),
         count(*) filter (where selected_layer = 'strategic'),
         count(*) filter (where selected_layer = 'systems')
  into v_execution, v_orchestration, v_strategic, v_systems
  from public.executive_support_audit_responses
  where participant_session_id = p_participant_session_id;

  v_max_score := greatest(v_execution, v_orchestration, v_strategic, v_systems);

  if v_execution = v_max_score then v_primary := array_append(v_primary, 'execution'); end if;
  if v_orchestration = v_max_score then v_primary := array_append(v_primary, 'orchestration'); end if;
  if v_strategic = v_max_score then v_primary := array_append(v_primary, 'strategic'); end if;
  if v_systems = v_max_score then v_primary := array_append(v_primary, 'systems'); end if;

  -- Secondary only when exactly one Primary layer.
  if array_length(v_primary, 1) = 1 then
    v_second_max := 0;
    if v_primary[1] != 'execution' and v_execution > v_second_max then v_second_max := v_execution; end if;
    if v_primary[1] != 'orchestration' and v_orchestration > v_second_max then v_second_max := v_orchestration; end if;
    if v_primary[1] != 'strategic' and v_strategic > v_second_max then v_second_max := v_strategic; end if;
    if v_primary[1] != 'systems' and v_systems > v_second_max then v_second_max := v_systems; end if;

    if v_second_max >= v_threshold then
      if v_primary[1] != 'execution' and v_execution = v_second_max then v_secondary := array_append(v_secondary, 'execution'); end if;
      if v_primary[1] != 'orchestration' and v_orchestration = v_second_max then v_secondary := array_append(v_secondary, 'orchestration'); end if;
      if v_primary[1] != 'strategic' and v_strategic = v_second_max then v_secondary := array_append(v_secondary, 'strategic'); end if;
      if v_primary[1] != 'systems' and v_systems = v_second_max then v_secondary := array_append(v_secondary, 'systems'); end if;
    end if;
  end if;

  insert into public.executive_support_audit_results (
    participant_session_id, config_id, execution_score, orchestration_score, strategic_score, systems_score,
    primary_layers, secondary_layers, calculated_at
  )
  values (
    p_participant_session_id, v_config_id, v_execution, v_orchestration, v_strategic, v_systems,
    v_primary, v_secondary, now()
  )
  on conflict (participant_session_id) do update
    set config_id = excluded.config_id,
        execution_score = excluded.execution_score,
        orchestration_score = excluded.orchestration_score,
        strategic_score = excluded.strategic_score,
        systems_score = excluded.systems_score,
        primary_layers = excluded.primary_layers,
        secondary_layers = excluded.secondary_layers,
        calculated_at = excluded.calculated_at
  returning * into v_row;

  return v_row;
end;
$$;
