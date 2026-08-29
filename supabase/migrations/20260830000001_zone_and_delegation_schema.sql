-- Milestone 2: Zone of Investment + Delegation/Leverage schema.
--
-- Design note that shapes everything below: matrix_cell, macro_zone, and
-- leverage_level_snapshot are all *derived* values a participant must never
-- be able to set directly (task instructions section 21/9). Rather than
-- relying on RLS `with check` clauses to police column values -- which
-- would still let a participant PATCH these tables directly via the
-- PostgREST API with a crafted value inside an otherwise "owned" row --
-- participant writes to these two tables happen ONLY through the
-- SECURITY DEFINER functions in the next migration. RLS on them grants
-- participants read-only access to their own rows; there is no participant
-- insert/update/delete policy at all.

-- ---------------------------------------------------------------------------
-- responsibilities: the ~20-item library participants choose 10-12 from.
-- Content dependency B. Seeded with dev placeholders in supabase/seed.sql
-- only -- never via migration -- exactly like assessments/questions in
-- Milestone 1.
-- ---------------------------------------------------------------------------
create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  label text not null,
  description text,
  leverage_level text not null check (leverage_level in ('execution', 'orchestration', 'strategic', 'systems')),
  sort_order integer not null default 0,
  active boolean not null default true,
  version integer not null default 1,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, version)
);

comment on column public.responsibilities.leverage_level is
  'Hidden from participants during the Zone of Investment exercise (brief '
  'section 9) -- never selected by any participant-facing query, only read '
  'server-side when snapshotting a Priority Delegation Opportunity.';

create trigger responsibilities_set_updated_at
  before update on public.responsibilities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- zone_matrix_cells: the configurable 9-cell competency x passion -> macro
-- zone mapping. Content dependency C. Left empty in every environment until
-- Yutori supplies the real mapping, except for the dev-only placeholder rows
-- in seed.sql.
-- ---------------------------------------------------------------------------
create table public.zone_matrix_cells (
  id uuid primary key default gen_random_uuid(),
  competency_level text not null check (competency_level in ('low', 'medium', 'high')),
  passion_level text not null check (passion_level in ('low', 'medium', 'high')),
  cell_name text not null,
  macro_zone text not null check (macro_zone in ('investment', 'ambiguity', 'vulnerability')),
  explanation text,
  version integer not null default 1,
  active boolean not null default true,
  is_placeholder boolean not null default false,
  unique (competency_level, passion_level, version)
);

comment on table public.zone_matrix_cells is
  'competency + passion -> matrix cell -> macro zone, as configuration '
  'rather than code (task instructions section 6). Classification logic '
  'reads the active version only -- see rate_responsibility().';

-- ---------------------------------------------------------------------------
-- participant_responsibilities: one row per responsibility a participant
-- selected within one session. competency/passion/matrix_cell/macro_zone
-- start null and are only ever written by rate_responsibility().
-- ---------------------------------------------------------------------------
create table public.participant_responsibilities (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  responsibility_id uuid not null references public.responsibilities (id) on delete restrict,
  competency text check (competency in ('low', 'medium', 'high')),
  passion text check (passion in ('low', 'medium', 'high')),
  matrix_cell text,
  macro_zone text check (macro_zone in ('investment', 'ambiguity', 'vulnerability')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_session_id, responsibility_id)
);

create index participant_responsibilities_ps_idx on public.participant_responsibilities (participant_session_id);

create trigger participant_responsibilities_set_updated_at
  before update on public.participant_responsibilities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- priority_delegation_opportunities: exactly 3 per participant_session,
-- written only by select_priority_delegation_opportunities().
-- ---------------------------------------------------------------------------
create table public.priority_delegation_opportunities (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  responsibility_id uuid not null references public.responsibilities (id) on delete restrict,
  selection_order integer not null check (selection_order between 1 and 3),
  leverage_level_snapshot text not null,
  created_at timestamptz not null default now(),
  unique (participant_session_id, responsibility_id),
  unique (participant_session_id, selection_order)
);

comment on column public.priority_delegation_opportunities.leverage_level_snapshot is
  'Copied from responsibilities.leverage_level at selection time and never '
  're-read from the live responsibility row afterward, so a later edit to '
  'the responsibility library cannot rewrite a participant''s historical '
  'result (task instructions section 15/16).';

create index priority_delegation_opportunities_ps_idx on public.priority_delegation_opportunities (participant_session_id);

-- ---------------------------------------------------------------------------
-- assessment_scoring_rules: threshold -> result-label configuration for a
-- scored assessment. Deliberately left empty in every environment -- there
-- is no Yutori-approved Delegation Beliefs scoring yet, and this table
-- existing-but-empty is what makes calculate_delegation_readiness() fall
-- back instead of inventing a result (task instructions section 22).
-- ---------------------------------------------------------------------------
create table public.assessment_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  version integer not null default 1,
  dimension text not null,
  min_score numeric,
  max_score numeric,
  result_label text not null,
  interpretation text,
  sort_order integer not null default 0,
  active boolean not null default true
);

create index assessment_scoring_rules_assessment_id_idx on public.assessment_scoring_rules (assessment_id);

-- ---------------------------------------------------------------------------
-- assessment_results: one calculated result per (participant_session,
-- assessment). Written only by calculate_delegation_readiness(). Raw
-- answers remain in `responses` -- this table is the calculated layer on
-- top, kept separate per task instructions section 12/13.
-- ---------------------------------------------------------------------------
create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  dimension_scores jsonb not null default '{}'::jsonb,
  overall_result text,
  interpretation text,
  rules_version integer not null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_session_id, assessment_id)
);

comment on column public.assessment_results.overall_result is
  'Null whenever no matching assessment_scoring_rules row exists -- a '
  'controlled fallback, not an invented score (task instructions section 22).';

create index assessment_results_ps_idx on public.assessment_results (participant_session_id);

create trigger assessment_results_set_updated_at
  before update on public.assessment_results
  for each row execute function public.set_updated_at();
