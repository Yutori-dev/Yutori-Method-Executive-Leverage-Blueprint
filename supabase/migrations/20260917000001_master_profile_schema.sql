-- Master participant profile (client brief 2026-09): today participants.id
-- IS auth.users.id, 1:1, no indirection -- two different email registrations
-- for the same real person are permanently unrelated. This adds a grouping
-- layer: participants.master_profile_id, admin-mergeable, so a person's
-- history can span sessions and (later) a person-level Character Assessment
-- without rebuilding the identity model.
--
-- Deliberately NOT attempting to merge auth.users identities themselves --
-- Supabase doesn't support merging two credentialed logins, and trying would
-- risk real login lockout. This stays a pure grouping layer on top.

create table public.master_profiles (
  id uuid primary key default gen_random_uuid(),
  -- Manual visionary<->integrator pairing (client brief item 3, last bullet)
  -- for future modules needing both people's input on one artifact.
  -- Self-referencing and deliberately NOT enforced symmetric at the DB level
  -- (the admin UI shows/sets it from both sides) -- keeping it a single
  -- nullable FK column avoids a two-column consistency problem.
  paired_master_profile_id uuid references public.master_profiles (id) on delete set null,
  -- Admin's explicit correction to the inferred Visionary/Integrator read.
  -- The inferred value itself is NOT stored here (would go stale the moment
  -- a linked participant's title changes or a new registration is merged
  -- in) -- it's computed on read from current_role_title instead.
  inferred_role_override text check (inferred_role_override in ('visionary', 'integrator')),
  created_at timestamptz not null default now()
);

comment on table public.master_profiles is
  'One row per real person. participants.master_profile_id groups every '
  'registration (possibly several different emails) that belongs to the '
  'same person. The only way two participants rows share a profile is an '
  'explicit admin merge -- see admin_merge_participant() and '
  'master_profile_merge_log.';

-- Audit trail for merges -- the only way a mistaken merge is diagnosable or
-- reversible after the fact, since a merge immediately grants the merged
-- accounts read access to each other's full session history.
create table public.master_profile_merge_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users (id) on delete set null,
  participant_id uuid not null references public.participants (id) on delete cascade,
  old_master_profile_id uuid,
  new_master_profile_id uuid not null,
  merged_at timestamptz not null default now()
);

alter table public.participants
  add column master_profile_id uuid references public.master_profiles (id);

-- Backfill: one new master_profiles row per existing participant (1:1,
-- nothing merged yet -- merges are an explicit future admin action).
insert into public.master_profiles (id, created_at)
select gen_random_uuid(), p.created_at
from public.participants p;

-- Pair the backfilled profiles to their participant in insertion order --
-- both queries share the same underlying row order since master_profiles
-- was populated directly from participants above with no other writes in
-- between, so a row-number join is safe and avoids needing a temp mapping
-- table for what is a one-time backfill.
with ranked_participants as (
  select id, row_number() over (order by created_at, id) as rn
  from public.participants
),
ranked_profiles as (
  select id, row_number() over (order by created_at, id) as rn
  from public.master_profiles
)
update public.participants p
set master_profile_id = rp.id
from ranked_participants rpar
join ranked_profiles rp on rp.rn = rpar.rn
where p.id = rpar.id;

do $$
begin
  if exists (select 1 from public.participants where master_profile_id is null) then
    raise exception 'master_profile_id backfill left null rows -- aborting before making the column required.';
  end if;
end $$;

alter table public.participants
  alter column master_profile_id set not null;

create index participants_master_profile_id_idx on public.participants (master_profile_id);

-- Governing security fix (see plan) -- participants_update_self has no
-- column restriction, so the moment master_profile_id exists a participant
-- could self-UPDATE it to any guessed/enumerated master_profiles.id and
-- immediately inherit a stranger's full session history through an
-- *existing* policy. Pin it back to its old value on any non-admin write,
-- regardless of what the caller tried to set it to.
create or replace function public.guard_master_profile_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.master_profile_id is distinct from old.master_profile_id then
    new.master_profile_id := old.master_profile_id;
  end if;
  return new;
end;
$$;

create trigger participants_guard_master_profile_id
  before update on public.participants
  for each row
  execute function public.guard_master_profile_id();

comment on trigger participants_guard_master_profile_id on public.participants is
  'Blocks self-service master_profile_id tampering -- only admin_merge_participant() (security definer, is_admin()-gated) may move a participant between profiles.';
