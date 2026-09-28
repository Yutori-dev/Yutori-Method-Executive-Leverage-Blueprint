-- Character Assessment (LimeSurvey-sourced, person-level, not session-level).
-- Foundation only: import raw responses, match them to a master profile,
-- hold scores and a report once those exist. Scoring and report generation
-- depend on the client's spreadsheet / report requirements and are added
-- later; until then an admin can attach a finished PDF by hand.
--
-- One row per completed assessment (one LimeSurvey response). Unmatched rows
-- (no participant with that email) are kept with master_profile_id null so an
-- admin can match them manually instead of losing the data.
create table public.character_assessments (
  id uuid primary key default gen_random_uuid(),
  master_profile_id uuid references public.master_profiles (id) on delete set null,
  -- De-dupe key: the LimeSurvey response id when present, else email+submit
  -- date. Re-uploading the same export must not create duplicates.
  import_key text not null unique,
  source_email text,
  source_completed_at timestamptz,
  imported_at timestamptz not null default now(),
  imported_by uuid references public.admin_users (id) on delete set null,
  -- Every column of the source row, exactly as exported.
  raw_responses jsonb not null default '{}'::jsonb,
  -- Filled by the scoring step once the client's spreadsheet logic is built.
  scores jsonb,
  scored_at timestamptz,
  -- Finished report (PDF) in the participant-files bucket, under
  -- <master_profile_id>/... so the existing storage policies apply.
  report_file_path text,
  report_file_name text,
  -- The participant only sees the report once an admin releases it.
  released_to_participant boolean not null default false,
  released_at timestamptz
);

create index character_assessments_master_profile_id_idx
  on public.character_assessments (master_profile_id);

alter table public.character_assessments enable row level security;

create policy "admins manage character assessments"
  on public.character_assessments for all
  using (public.is_admin())
  with check (public.is_admin());

-- Participants read only their own profile's assessments, and only after
-- release. can_read_master_profile is the existing security-definer helper
-- (admin, or any registration sharing the profile).
create policy "participants read released own character assessments"
  on public.character_assessments for select
  using (
    released_to_participant
    and master_profile_id is not null
    and public.can_read_master_profile(master_profile_id)
  );
