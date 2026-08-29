-- Yutori Method Executive Leverage Blueprint
-- Milestone 1: core foundation tables (admin, participant, session, module state)
--
-- Design notes:
--   - participants.id and admin_users.id are the same UUID as the corresponding
--     auth.users(id) row. There is no separate "profile id" — this keeps RLS
--     policies a simple `id = auth.uid()` comparison everywhere.
--   - modules is a small reference table seeded with the dashboard module
--     sequence named in the brief (section 5.1). It is structural navigation
--     data, not business content, so it is safe to seed via migration.
--   - Cohort-wide unlock state lives on sessions.active_module_id (the
--     furthest-unlocked checkpoint). Per-participant progress within an
--     unlocked module lives in participant_module_progress. Combining the two
--     produces the LOCKED / OPEN / IN_PROGRESS / COMPLETE states required by
--     brief section 8.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_users: allowlist of facilitator/admin accounts (Nicole, Valerie, ...).
-- Rows are provisioned by a service-role script/seed, not by self-signup.
-- ---------------------------------------------------------------------------
create table public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- participants: one row per person, reused across every session they join.
-- ---------------------------------------------------------------------------
create table public.participants (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) > 0),
  last_name text not null check (char_length(trim(last_name)) > 0),
  email text not null unique,
  created_at timestamptz not null default now(),
  last_login timestamptz
);

-- ---------------------------------------------------------------------------
-- modules: static catalog of the dashboard journey (brief section 5.1).
-- Content for each module belongs to later milestones; this table only
-- carries navigation/sequencing metadata.
-- ---------------------------------------------------------------------------
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  sort_order integer not null unique,
  requires_live_workshop boolean not null default false,
  active boolean not null default true
);

comment on table public.modules is
  'Reference catalog of the participant journey. requires_live_workshop = true '
  'marks modules (e.g. Character) whose content only unlocks in the later '
  'in-person workshop per the brief; Milestone 1 shows them locked.';

-- ---------------------------------------------------------------------------
-- sessions: a distinct facilitated workshop cohort.
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  organization text,
  event_date date,
  format text not null default 'virtual' check (format in ('virtual', 'in_person')),
  status text not null default 'draft' check (status in ('draft', 'active', 'complete', 'archived')),
  join_code text not null unique,
  active_module_id uuid references public.modules (id) on delete set null,
  architecture_revealed boolean not null default false,
  created_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.sessions.active_module_id is
  'Furthest module the facilitator has cohort-wide unlocked. Null = nothing '
  'unlocked yet beyond registration. Modules with sort_order <= this module''s '
  'sort_order are unlocked for every participant in the session.';

comment on column public.sessions.architecture_revealed is
  'Reserved for the Milestone 3 architecture-reveal control (brief section 9). '
  'Not driven by any logic in Milestone 1.';

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- participant_sessions: enrollment of one participant into one session.
-- ---------------------------------------------------------------------------
create table public.participant_sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  current_module_id uuid references public.modules (id) on delete set null,
  completion_state text not null default 'not_started'
    check (completion_state in ('not_started', 'in_progress', 'complete')),
  started_at timestamptz,
  completed_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (participant_id, session_id)
);

comment on constraint participant_sessions_participant_id_session_id_key
  on public.participant_sessions is
  'Database-level guard against duplicate registration for the same session '
  '(brief section 4.2 / edge case in section 24).';

create index participant_sessions_session_id_idx on public.participant_sessions (session_id);
create index participant_sessions_participant_id_idx on public.participant_sessions (participant_id);

-- ---------------------------------------------------------------------------
-- participant_module_progress: per-participant status within an unlocked
-- module. Combined with sessions.active_module_id this yields the four
-- required module states.
-- ---------------------------------------------------------------------------
create table public.participant_module_progress (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null references public.participant_sessions (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete')),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (participant_session_id, module_id)
);

create index participant_module_progress_ps_idx
  on public.participant_module_progress (participant_session_id);

create trigger participant_module_progress_set_updated_at
  before update on public.participant_module_progress
  for each row execute function public.set_updated_at();
