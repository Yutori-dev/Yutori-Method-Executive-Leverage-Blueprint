-- Configurable Activity Engine foundation (brief section 14 / 20).
--
-- This is intentionally content-free: no real Yutori questions, scoring
-- rules or recommendation logic live here (see brief section 30, Content
-- Dependency Register). It only establishes a versioned, admin-editable
-- shape that later milestones populate with real assessments.
--
-- assessment_id/question_id/answer_id are UUIDs so that editing content
-- creates new versioned rows rather than mutating history (brief section 21).

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name text not null,
  version integer not null default 1,
  active boolean not null default true,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, version)
);

comment on column public.assessments.is_placeholder is
  'True for development-only demo content. The app must refuse to render '
  'placeholder assessments when running in production (defense in depth on '
  'top of this content simply never being seeded there).';

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  prompt text not null,
  type text not null check (
    type in ('multiple_choice', 'multi_select', 'rating_scale', 'numeric', 'free_text')
  ),
  config jsonb not null default '{}'::jsonb,
  required boolean not null default true,
  sort_order integer not null default 0,
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.questions.config is
  'Type-specific configuration, e.g. {"min":0,"max":10,"step":1} for numeric/'
  'rating_scale or {"placeholder":"..."} for free_text. Deliberately schemaless '
  'so new input types do not require a migration.';

create index questions_assessment_id_idx on public.questions (assessment_id);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create table public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null,
  value text not null,
  score_value numeric,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  unique (question_id, value)
);

comment on column public.answer_options.score_value is
  'Configurable score storage only. Milestone 1 does not compute or interpret '
  'scores anywhere in the application.';

create index answer_options_question_id_idx on public.answer_options (question_id);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  answer jsonb not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_session_id, question_id)
);

comment on table public.responses is
  'One row per (participant_session, question), upserted on every autosave. '
  'submitted_at is set once the participant explicitly completes the module; '
  'it stays null while a draft is only autosaved.';

create index responses_participant_session_id_idx on public.responses (participant_session_id);

create trigger responses_set_updated_at
  before update on public.responses
  for each row execute function public.set_updated_at();
