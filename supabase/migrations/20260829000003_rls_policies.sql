-- Row Level Security for every Milestone 1 table.
--
-- Policy shape used throughout: a participant may only read/write rows that
-- trace back to their own auth.uid() via participant_id / participant_session_id.
-- Admins (rows in admin_users) get broad read access and write access to
-- session/module configuration. Nothing is left relying on frontend checks
-- alone (brief section 12 / task instructions section 12).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

comment on function public.is_admin() is
  'Security-definer helper so RLS policies can check admin_users without '
  'themselves needing a permissive select policy on admin_users.';

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;

create policy admin_users_select on public.admin_users
  for select using (public.is_admin());

-- No insert/update/delete policy: admin accounts are provisioned via the
-- service role (seed script / Supabase dashboard), never from the client.

-- ---------------------------------------------------------------------------
-- participants
-- ---------------------------------------------------------------------------
alter table public.participants enable row level security;

create policy participants_select on public.participants
  for select using (id = auth.uid() or public.is_admin());

create policy participants_insert_self on public.participants
  for insert with check (id = auth.uid());

create policy participants_update_self on public.participants
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- modules (reference data)
-- ---------------------------------------------------------------------------
alter table public.modules enable row level security;

create policy modules_select_authenticated on public.modules
  for select using (auth.role() = 'authenticated');

create policy modules_write_admin on public.modules
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;

create policy sessions_select on public.sessions
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.session_id = sessions.id and ps.participant_id = auth.uid()
    )
  );

create policy sessions_write_admin on public.sessions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- participant_sessions
-- ---------------------------------------------------------------------------
alter table public.participant_sessions enable row level security;

create policy participant_sessions_select on public.participant_sessions
  for select using (participant_id = auth.uid() or public.is_admin());

create policy participant_sessions_insert_self on public.participant_sessions
  for insert with check (participant_id = auth.uid());

create policy participant_sessions_update on public.participant_sessions
  for update using (participant_id = auth.uid() or public.is_admin())
  with check (participant_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- participant_module_progress
-- ---------------------------------------------------------------------------
alter table public.participant_module_progress enable row level security;

create policy participant_module_progress_select on public.participant_module_progress
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = participant_module_progress.participant_session_id
        and ps.participant_id = auth.uid()
    )
  );

create policy participant_module_progress_write on public.participant_module_progress
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = participant_module_progress.participant_session_id
        and ps.participant_id = auth.uid()
    )
  ) with check (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = participant_module_progress.participant_session_id
        and ps.participant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- assessments / questions / answer_options (content, admin-editable)
-- ---------------------------------------------------------------------------
alter table public.assessments enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;

create policy assessments_select on public.assessments
  for select using (active = true or public.is_admin());

create policy assessments_write_admin on public.assessments
  for all using (public.is_admin()) with check (public.is_admin());

create policy questions_select on public.questions
  for select using (active = true or public.is_admin());

create policy questions_write_admin on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

create policy answer_options_select on public.answer_options
  for select using (active = true or public.is_admin());

create policy answer_options_write_admin on public.answer_options
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- responses
-- ---------------------------------------------------------------------------
alter table public.responses enable row level security;

create policy responses_select on public.responses
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = responses.participant_session_id and ps.participant_id = auth.uid()
    )
  );

create policy responses_write on public.responses
  for all using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = responses.participant_session_id and ps.participant_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = responses.participant_session_id and ps.participant_id = auth.uid()
    )
  );
