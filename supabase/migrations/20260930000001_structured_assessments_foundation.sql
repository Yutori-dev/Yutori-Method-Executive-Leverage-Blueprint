-- Shared foundation for the six new modules (client brief item 4, module
-- briefs received 2026-09-30): EA Experience Assessment, Visionary Thinking
-- Traps Diagnostic, EA Leverage & Orchestration Audit (Visionary + EA
-- versions, dyad-matched), Start-Stop-Shift, High-Leverage Handoff.
--
-- Each spec independently demands the same things: admin-editable question
-- wording/order/scoring that creates a NEW VERSION on change so historical
-- results stay tied to the version completed, per-question config far
-- richer than the existing fixed-column modules (matrices, branching,
-- multi-select caps, scoring formulas, tie-break orders), and (for the
-- Leverage Audit) two assessments linked by a shared dyad so responses can
-- be compared once both sides are done. Building six bespoke schemas would
-- both take longer and multiply the versioning logic six times over --
-- instead this is one config-driven engine: `config` on each version is a
-- jsonb blob holding that assessment's full shape (copy, questions, scales,
-- scoring), and `answers`/`derived` on each submission are jsonb too.
-- Trades some column-level type safety for actually being buildable in the
-- time available; the write path (structuredAssessments.ts, not yet built)
-- is the single place that has to agree with each spec's shape.
--
-- Reuses the existing `modules` / session on-off-toggle framework (brief
-- item 4's "turn a module on or off for a session" already exists) --
-- each new assessment gets its own `modules` row so it slots into that
-- toggle as-is, no new admin surface needed for on/off.

create table public.structured_assessments (
  id uuid primary key default gen_random_uuid(),
  -- Stable code the app keys UI/scoring logic off of; never shown to anyone.
  assessment_key text not null unique,
  module_id uuid not null references public.modules (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now()
);

comment on column public.structured_assessments.assessment_key is
  'One of: ea_experience_assessment, thinking_traps, ea_leverage_audit_visionary, '
  'ea_leverage_audit_ea, start_stop_shift, high_leverage_handoff.';

create table public.structured_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.structured_assessments (id) on delete cascade,
  version_number integer not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.admin_users (id) on delete set null,
  unique (assessment_id, version_number)
);

-- Exactly one "current" version per assessment -- new participants always
-- start against this one; in-progress/completed submissions keep pointing
-- at whichever version they actually started under (see submissions table),
-- so an admin edit mid-session never rewrites someone's answers out from
-- under them or changes how a finished result reads.
create unique index structured_assessment_versions_current_idx
  on public.structured_assessment_versions (assessment_id)
  where (config->>'is_current')::boolean is true;

comment on index public.structured_assessment_versions_current_idx is
  'Partial unique index enforcing at most one current version per '
  'assessment -- "current" is a flag inside config (is_current: true) '
  'rather than a separate column so a version-publish is a single row '
  'update (old current -> false, new row -> true) instead of a two-table '
  'write.';

create table public.structured_assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  assessment_id uuid not null references public.structured_assessments (id) on delete cascade,
  version_id uuid not null references public.structured_assessment_versions (id) on delete restrict,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete')),
  -- Raw per-question answers, keyed by the question id from that version's
  -- config. Shape differs per assessment_key (e.g. Leverage Audit stores
  -- {current_ownership, desired_direction} pairs; Experience Assessment
  -- stores scalars and arrays for its matrix/multi-select rows).
  answers jsonb not null default '{}'::jsonb,
  -- Computed, not re-derivable from answers alone without the scoring
  -- config at completion time (trap scores, leverage classifications,
  -- ranked results) -- stored once at submission so it survives a later
  -- config/version change exactly as the brief's versioning rule requires.
  derived jsonb not null default '{}'::jsonb,
  -- EA Leverage Audit (EA version) only: which executive this EA supports,
  -- and the shared id used to match the two assessments for comparison.
  -- Null for every other assessment_key.
  dyad_id uuid,
  associated_executive_participant_session_id uuid references public.participant_sessions (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (participant_session_id, assessment_id)
);

create index structured_assessment_submissions_ps_idx
  on public.structured_assessment_submissions (participant_session_id);
create index structured_assessment_submissions_dyad_idx
  on public.structured_assessment_submissions (dyad_id) where dyad_id is not null;

create trigger structured_assessment_submissions_set_updated_at
  before update on public.structured_assessment_submissions
  for each row execute function public.set_updated_at();

alter table public.structured_assessments enable row level security;
alter table public.structured_assessment_versions enable row level security;
alter table public.structured_assessment_submissions enable row level security;

create policy "admins manage structured assessments"
  on public.structured_assessments for all
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage structured assessment versions"
  on public.structured_assessment_versions for all
  using (public.is_admin()) with check (public.is_admin());

-- Config/versions are read by every signed-in participant taking that
-- assessment (not sensitive -- it's the question text), admin-write only.
create policy "authenticated users read structured assessments"
  on public.structured_assessments for select
  using (auth.uid() is not null);
create policy "authenticated users read structured assessment versions"
  on public.structured_assessment_versions for select
  using (auth.uid() is not null);

-- Submissions: self-scoped writes (live interaction, same as every other
-- module's answer tables -- see can_read_participant_session's own
-- comment for why sibling-read never extends to writes), sibling-read
-- once looking, admin-all.
create policy "admins manage structured assessment submissions"
  on public.structured_assessment_submissions for all
  using (public.is_admin()) with check (public.is_admin());

create policy "participants write own structured assessment submissions"
  on public.structured_assessment_submissions for insert
  with check (
    exists (
      select 1 from public.participant_sessions ps
      join public.participants me on me.id = ps.participant_id
      where ps.id = participant_session_id and me.id = auth.uid()
    )
  );

create policy "participants update own structured assessment submissions"
  on public.structured_assessment_submissions for update
  using (
    exists (
      select 1 from public.participant_sessions ps
      join public.participants me on me.id = ps.participant_id
      where ps.id = participant_session_id and me.id = auth.uid()
    )
  );

create policy "sibling can read structured assessment submissions"
  on public.structured_assessment_submissions for select
  using (public.can_read_participant_session(participant_session_id));

-- Seed the six modules (inactive/last in sort order until each is actually
-- built and Nicole wants them live -- matches how existing modules ship
-- toggle-able but empty ahead of content) and their structured_assessments
-- catalog rows. sort_order continues from the existing max.
do $$
declare
  v_max_sort integer;
begin
  select coalesce(max(sort_order), 0) into v_max_sort from public.modules;

  insert into public.modules (key, name, sort_order, active) values
    ('ea_experience_assessment', 'EA Experience Assessment', v_max_sort + 1, false),
    ('thinking_traps', 'Visionary Thinking Traps Diagnostic', v_max_sort + 2, false),
    ('ea_leverage_audit_visionary', 'EA Leverage & Orchestration Audit', v_max_sort + 3, false),
    ('ea_leverage_audit_ea', 'EA Leverage & Orchestration Audit (EA)', v_max_sort + 4, false),
    ('start_stop_shift', 'Start-Stop-Shift', v_max_sort + 5, false),
    ('high_leverage_handoff', 'High-Leverage Handoff', v_max_sort + 6, false)
  on conflict (key) do nothing;

  insert into public.structured_assessments (assessment_key, module_id, name)
  select m.key, m.id, m.name
  from public.modules m
  where m.key in (
    'ea_experience_assessment', 'thinking_traps', 'ea_leverage_audit_visionary',
    'ea_leverage_audit_ea', 'start_stop_shift', 'high_leverage_handoff'
  )
  on conflict (assessment_key) do nothing;
end $$;
