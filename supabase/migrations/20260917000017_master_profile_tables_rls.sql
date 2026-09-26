-- Real gap found before building the admin UI: master_profiles and
-- master_profile_merge_log were created without RLS enabled at all --
-- meaning any authenticated participant could read (and, per this
-- project's default broad grants, likely write) both tables directly,
-- including the audit log of every merge ever performed. Admin-only,
-- matching every other admin-managed table in this project.
alter table public.master_profiles enable row level security;
alter table public.master_profile_merge_log enable row level security;

create policy "admins manage master profiles"
  on public.master_profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins read merge log"
  on public.master_profile_merge_log for select
  using (public.is_admin());

-- No participant-facing policy on either table -- participants never
-- query master_profiles directly; every downstream table's own
-- can_read_participant_session()/my_master_profile_id() helpers are
-- security definer and read master_profiles internally regardless of
-- this table's own RLS, so this doesn't affect the sibling-read feature
-- already verified working.
