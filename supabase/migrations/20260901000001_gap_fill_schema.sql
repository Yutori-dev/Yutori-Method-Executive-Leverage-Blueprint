-- Fills brief items that were never assigned to a milestone but exist in
-- the master brief: Visionary/Integrator/Hybrid self-identification,
-- private reflections (White Whale, Success Vision), the "Discuss My
-- Blueprint" follow-up queue, and privacy consent tracking.
--
-- All of these are raw participant-authored input (a self-report, free
-- text, a one-time click, a consent timestamp) rather than a derived/
-- computed value, so -- consistent with the pattern established since
-- Milestone 1 (see docs/ARCHITECTURE_DECISIONS.md: RPCs are reserved for
-- values a participant must not be able to fake) -- these are writable
-- directly under ordinary RLS, not routed through a SECURITY DEFINER
-- function.

-- ---------------------------------------------------------------------------
-- Visionary / Integrator / Hybrid self-identification (brief Activity 1C).
-- A raw self-report, not a derived value -- participant can set it on their
-- own participant_sessions row, same as current_module_id already was.
-- ---------------------------------------------------------------------------
alter table public.participant_sessions
  add column self_identification text
    check (self_identification in ('visionary', 'integrator', 'hybrid'));

-- ---------------------------------------------------------------------------
-- participant_reflections: White Whale (brief Activity 1B) and Success
-- Vision (brief section 11) -- both explicitly private, participant +
-- admin only, never aggregated or shown in Presentation Mode.
-- ---------------------------------------------------------------------------
create table public.participant_reflections (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null unique references public.participant_sessions (id) on delete cascade,
  white_whale text,
  success_vision text,
  success_vision_white_whale_followup text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.participant_reflections is
  'Private free-text reflections. Never selected by any aggregate/Presentation '
  'Mode query -- brief sections 1B/11/19 are explicit these stay participant + '
  'admin only.';

create trigger participant_reflections_set_updated_at
  before update on public.participant_reflections
  for each row execute function public.set_updated_at();

alter table public.participant_reflections enable row level security;

create policy participant_reflections_select on public.participant_reflections
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = participant_reflections.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy participant_reflections_write_own on public.participant_reflections
  for all using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = participant_reflections.participant_session_id and ps.participant_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = participant_reflections.participant_session_id and ps.participant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- follow_up_interests: "Discuss My Blueprint" (brief section 15 / A12).
-- ---------------------------------------------------------------------------
create table public.follow_up_interests (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null unique references public.participant_sessions (id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);

alter table public.follow_up_interests enable row level security;

create policy follow_up_interests_select on public.follow_up_interests
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = follow_up_interests.participant_session_id and ps.participant_id = auth.uid()
    )
  );

-- Participants can only ever create their own row once (the unique
-- constraint on participant_session_id enforces "once"); only admins can
-- update status while working the queue.
create policy follow_up_interests_insert_own on public.follow_up_interests
  for insert with check (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = follow_up_interests.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy follow_up_interests_update_admin on public.follow_up_interests
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privacy consent (brief section 26). The draft language itself is
-- explicitly "REQUIRES YUTORI APPROVAL BEFORE PRODUCTION" -- this column
-- only tracks *that a version was shown and accepted*, it does not imply
-- the copy is final.
-- ---------------------------------------------------------------------------
alter table public.participants
  add column privacy_consent_given_at timestamptz,
  add column privacy_consent_version text;
