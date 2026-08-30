-- Delegation Beliefs Assessment rebuild (client V1 developer implementation
-- spec). Replaces the dev-only placeholder (`dev_demo_delegation_beliefs`,
-- generic questions/answer_options machinery) with dedicated schema, since
-- this assessment's shape (per-domain averaging, individually-interpreted
-- Ownership Transfer Indicators, two different Likert anchors) doesn't fit
-- the generic constraint_label/tie_break_priority columns added for the
-- Executive Leverage Diagnostic. The old placeholder assessment/questions
-- are left in place (dev-only, is_placeholder=true, harmless) -- only
-- DelegationFlow.tsx stops reading them.

create table public.delegation_beliefs_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  active boolean not null default true,
  intro_copy text not null,
  ownership_transfer_intro text not null,
  trust_control_low_copy text not null,
  trust_control_mid_copy text not null,
  trust_control_high_copy text not null,
  team_outcomes_low_copy text not null,
  team_outcomes_mid_copy text not null,
  team_outcomes_high_copy text not null,
  workload_resources_low_copy text not null,
  workload_resources_mid_copy text not null,
  workload_resources_high_copy text not null,
  threshold_low_max numeric not null default 2.49,
  threshold_mid_max numeric not null default 3.49,
  created_at timestamptz not null default now()
);

create table public.delegation_beliefs_questions (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references public.delegation_beliefs_config (id) on delete cascade,
  sort_order integer not null,
  section text not null check (section in ('belief', 'ownership_transfer')),
  prompt text not null,
  domain text check (domain in ('trust_control', 'team_outcomes', 'workload_resources')),
  opportunity_label text,
  rarely_interpretation text,
  sometimes_interpretation text,
  active boolean not null default true,
  check (
    (section = 'belief' and domain is not null and opportunity_label is null)
    or (section = 'ownership_transfer' and domain is null and opportunity_label is not null
        and rarely_interpretation is not null and sometimes_interpretation is not null)
  )
);

create index delegation_beliefs_questions_config_id_idx on public.delegation_beliefs_questions (config_id);

create table public.delegation_beliefs_responses (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  question_id uuid not null references public.delegation_beliefs_questions (id) on delete restrict,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique (participant_session_id, question_id)
);

create index delegation_beliefs_responses_ps_idx on public.delegation_beliefs_responses (participant_session_id);

create table public.delegation_beliefs_results (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null unique references public.participant_sessions (id) on delete cascade,
  config_id uuid not null references public.delegation_beliefs_config (id),
  trust_control_avg numeric(3, 2) not null,
  team_outcomes_avg numeric(3, 2) not null,
  workload_resources_avg numeric(3, 2) not null,
  strongest_barrier_domains text[] not null default '{}',
  flagged_opportunity_question_ids uuid[] not null default '{}',
  priority_opportunity_question_id uuid references public.delegation_beliefs_questions (id),
  calculated_at timestamptz not null default now()
);

alter table public.delegation_beliefs_config enable row level security;
alter table public.delegation_beliefs_questions enable row level security;
alter table public.delegation_beliefs_responses enable row level security;
alter table public.delegation_beliefs_results enable row level security;

create policy "authenticated can read delegation beliefs config"
  on public.delegation_beliefs_config for select
  using (auth.uid() is not null);

create policy "authenticated can read delegation beliefs questions"
  on public.delegation_beliefs_questions for select
  using (auth.uid() is not null);

create policy "participants read own delegation beliefs responses"
  on public.delegation_beliefs_responses for select
  using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = delegation_beliefs_responses.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy "admins read all delegation beliefs responses"
  on public.delegation_beliefs_responses for select
  using (public.is_admin());

create policy "participants read own delegation beliefs results"
  on public.delegation_beliefs_results for select
  using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = delegation_beliefs_results.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy "admins read all delegation beliefs results"
  on public.delegation_beliefs_results for select
  using (public.is_admin());

-- Real content, exact wording from the client's V1 spec.
insert into public.delegation_beliefs_config (
  version, active, intro_copy, ownership_transfer_intro,
  trust_control_low_copy, trust_control_mid_copy, trust_control_high_copy,
  team_outcomes_low_copy, team_outcomes_mid_copy, team_outcomes_high_copy,
  workload_resources_low_copy, workload_resources_mid_copy, workload_resources_high_copy
) values (
  1, true,
  'The work that stays with us is shaped by more than what we consciously decide to own. Our beliefs about trust, control, quality and what it takes to transfer responsibility can influence how much leverage we''re actually able to create. The following statements will help surface some of the factors that may be influencing what you retain and what you release. For each statement, indicate how strongly you agree or disagree. Answer based on what is true for you today.',
  'Now consider what happens when you do delegate. For each statement, indicate how consistently it reflects your current practice.',
  'Your responses suggest that trust and control are unlikely to be primary barriers to delegation. You appear relatively comfortable allowing work to move beyond your direct ownership, even when others may execute it differently than you would.',
  'Your responses suggest that trust and control may influence what you are willing to release. Concerns about quality, efficiency or maintaining control may cause some responsibilities to remain with you even when they could potentially be owned elsewhere.',
  'Your responses suggest that trust and control may be meaningful barriers to greater delegation. A strong preference for your own standards, approach or oversight may be keeping work anchored to you even when another capable owner could potentially carry it.',
  'Your responses suggest that concern about your team or delegated outcomes is unlikely to be a primary barrier to delegation. You appear relatively willing to accept the inherent risk of relying on others to deliver important work.',
  'Your responses suggest that confidence in others or concern about delegated outcomes may influence what you are willing to release. When the stakes feel higher or confidence in the outcome is lower, you may be more inclined to retain ownership or stay closely involved.',
  'Your responses suggest that confidence in others and concern about delegated outcomes may be meaningful barriers to greater delegation. The perceived risk of work falling short of your expectations may be keeping important responsibilities dependent on your involvement.',
  'Your responses suggest that workload and access to experienced support are unlikely to be primary barriers to delegation. Your current capacity or available talent may present fewer constraints on delegation than other factors.',
  'Your responses suggest that workload or access to experienced support may be limiting your ability to delegate as fully as you would like. Capacity pressure or gaps in available talent may be contributing to work remaining with you.',
  'Your responses suggest that workload and access to experienced support may be meaningful barriers to greater delegation. You may be carrying more than you believe you should while lacking people with the experience required to absorb meaningful ownership.'
);

do $$
declare
  v_config_id uuid;
begin
  select id into v_config_id from public.delegation_beliefs_config where version = 1 and active = true;

  insert into public.delegation_beliefs_questions (config_id, sort_order, section, prompt, domain) values
    (v_config_id, 1, 'belief', 'When I delegate a job, I often find that the outcome is such that I end up doing the job over myself.', 'trust_control'),
    (v_config_id, 2, 'belief', 'I''d delegate more. But I feel I can do the task better than the person I might delegate it to.', 'trust_control'),
    (v_config_id, 3, 'belief', 'From my past experiences, I have not found that delegation saves me any time.', 'trust_control'),
    (v_config_id, 4, 'belief', 'I feel when I delegate I lose control.', 'trust_control'),
    (v_config_id, 5, 'belief', 'I feel like my team lacks the commitment that I have. So any job that I delegate won''t get done as well as I''d do it.', 'team_outcomes'),
    (v_config_id, 6, 'belief', 'I would like to delegate more, but the projects I delegate never seem to get done the way I want them to.', 'team_outcomes'),
    (v_config_id, 7, 'belief', 'I believe a failed delegation attempt can have a strong negative affect on the well-being of my business.', 'team_outcomes'),
    (v_config_id, 8, 'belief', 'When I have given clear instructions and the job doesn''t get done, I get upset.', 'team_outcomes'),
    (v_config_id, 9, 'belief', 'I work longer hours than I should.', 'workload_resources'),
    (v_config_id, 10, 'belief', 'I can''t delegate as much as I''d like to because I do not have the people with the needed experience for the projects at hand.', 'workload_resources');

  insert into public.delegation_beliefs_questions (config_id, sort_order, section, prompt, opportunity_label, rarely_interpretation, sometimes_interpretation) values
    (v_config_id, 11, 'ownership_transfer',
     'When I delegate, I clarify what matters most if tradeoffs are required (e.g., speed vs quality vs cost).',
     'Navigating Tradeoffs',
     'You may be delegating outcomes without consistently transferring the judgment needed to navigate tradeoffs independently.',
     'You sometimes clarify how competing priorities should be weighed, but delegates may still need to return to you when tradeoffs arise.'),
    (v_config_id, 12, 'ownership_transfer',
     'When I delegate, I have a genuine belief in the Delegate''s ability to successfully own the responsibility, even if their approach or timeline differs from mine.',
     'Allowing Different Approaches',
     'You may find it difficult to fully release ownership when someone else''s approach differs from how you would handle the work.',
     'Your confidence in delegated ownership may depend heavily on whether the other person''s approach aligns with your own.'),
    (v_config_id, 13, 'ownership_transfer',
     'I use delegation moments as opportunities to build long-term capability, not just get the task done.',
     'Building Future Capability',
     'Delegation may currently function more as a way to move work than as a mechanism for increasing what others can own over time.',
     'You sometimes use delegation to build capability, but immediate execution may still take precedence over developing greater future ownership.'),
    (v_config_id, 14, 'ownership_transfer',
     'When I delegate, I avoid stepping in when timelines slip and instead address root causes.',
     'Preserving Ownership Through Setbacks',
     'When delegated work begins to slip, you may be prone to stepping back into execution, returning ownership to yourself rather than strengthening the conditions around it.',
     'When delegated work encounters problems, you sometimes preserve the other person''s ownership but may also step back in to protect the outcome.'),
    (v_config_id, 15, 'ownership_transfer',
     'When I delegate, I define escalation triggers explicitly so that escalation does not occur based on personal judgment, urgency or emotion.',
     'Creating Clear Escalation Boundaries',
     'Without explicit escalation boundaries, decisions may return to you based on uncertainty or perceived urgency rather than because your involvement is actually required.',
     'You sometimes establish clear escalation boundaries, but delegates may still need to use personal judgment about when to bring decisions back to you.');
end $$;

-- save_delegation_belief_response: own-session, per-question autosave.
create or replace function public.save_delegation_belief_response(
  p_participant_session_id uuid,
  p_question_id uuid,
  p_score smallint
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

  if not public.is_module_unlocked_for_session(v_session_id, 'delegation') then
    raise exception 'The Delegation module is not yet unlocked.';
  end if;

  if p_score < 1 or p_score > 5 then
    raise exception 'Score must be between 1 and 5.';
  end if;

  insert into public.delegation_beliefs_responses (participant_session_id, question_id, score)
  values (p_participant_session_id, p_question_id, p_score)
  on conflict (participant_session_id, question_id) do update set score = excluded.score;
end;
$$;

-- calculate_delegation_beliefs_results: computes domain averages, strongest
-- barrier(s) (ties included, per spec section 5), flagged Ownership
-- Transfer Opportunities (score 1-2, ascending score then question order,
-- per spec section 7), and the single priority opportunity for the
-- Blueprint (lowest-scoring flagged, question-order tiebreak, per spec
-- section 10).
create or replace function public.calculate_delegation_beliefs_results(p_participant_session_id uuid)
returns public.delegation_beliefs_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_config_id uuid;
  v_total_questions integer;
  v_answered_count integer;
  v_trust_avg numeric(3, 2);
  v_team_avg numeric(3, 2);
  v_workload_avg numeric(3, 2);
  v_max_avg numeric(3, 2);
  v_threshold_low_max numeric;
  v_barrier_domains text[] := '{}';
  v_flagged_ids uuid[];
  v_priority_id uuid;
  v_row public.delegation_beliefs_results;
begin
  select session_id into v_session_id
  from public.participant_sessions
  where id = p_participant_session_id and participant_id = auth.uid();

  if v_session_id is null then
    raise exception 'Not authorized for this participant session.';
  end if;

  select id, threshold_low_max into v_config_id, v_threshold_low_max
  from public.delegation_beliefs_config where active = true order by version desc limit 1;

  select count(*) into v_total_questions
  from public.delegation_beliefs_questions where config_id = v_config_id and active = true;

  select count(*) into v_answered_count
  from public.delegation_beliefs_responses r
  join public.delegation_beliefs_questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id and q.config_id = v_config_id and q.active = true;

  if v_answered_count < v_total_questions then
    raise exception 'All questions must be answered before scoring (% of %).', v_answered_count, v_total_questions;
  end if;

  select avg(r.score) into v_trust_avg
  from public.delegation_beliefs_responses r
  join public.delegation_beliefs_questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id and q.domain = 'trust_control';

  select avg(r.score) into v_team_avg
  from public.delegation_beliefs_responses r
  join public.delegation_beliefs_questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id and q.domain = 'team_outcomes';

  select avg(r.score) into v_workload_avg
  from public.delegation_beliefs_responses r
  join public.delegation_beliefs_questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id and q.domain = 'workload_resources';

  v_max_avg := greatest(v_trust_avg, v_team_avg, v_workload_avg);

  if v_max_avg > v_threshold_low_max then
    if v_trust_avg = v_max_avg then v_barrier_domains := array_append(v_barrier_domains, 'trust_control'); end if;
    if v_team_avg = v_max_avg then v_barrier_domains := array_append(v_barrier_domains, 'team_outcomes'); end if;
    if v_workload_avg = v_max_avg then v_barrier_domains := array_append(v_barrier_domains, 'workload_resources'); end if;
  end if;

  select array_agg(r.question_id order by r.score asc, q.sort_order asc)
  into v_flagged_ids
  from public.delegation_beliefs_responses r
  join public.delegation_beliefs_questions q on q.id = r.question_id
  where r.participant_session_id = p_participant_session_id
    and q.section = 'ownership_transfer'
    and r.score in (1, 2);

  v_flagged_ids := coalesce(v_flagged_ids, '{}');
  if array_length(v_flagged_ids, 1) > 0 then
    v_priority_id := v_flagged_ids[1];
  end if;

  insert into public.delegation_beliefs_results (
    participant_session_id, config_id, trust_control_avg, team_outcomes_avg, workload_resources_avg,
    strongest_barrier_domains, flagged_opportunity_question_ids, priority_opportunity_question_id, calculated_at
  )
  values (
    p_participant_session_id, v_config_id, v_trust_avg, v_team_avg, v_workload_avg,
    v_barrier_domains, v_flagged_ids, v_priority_id, now()
  )
  on conflict (participant_session_id) do update
    set config_id = excluded.config_id,
        trust_control_avg = excluded.trust_control_avg,
        team_outcomes_avg = excluded.team_outcomes_avg,
        workload_resources_avg = excluded.workload_resources_avg,
        strongest_barrier_domains = excluded.strongest_barrier_domains,
        flagged_opportunity_question_ids = excluded.flagged_opportunity_question_ids,
        priority_opportunity_question_id = excluded.priority_opportunity_question_id,
        calculated_at = excluded.calculated_at
  returning * into v_row;

  return v_row;
end;
$$;
