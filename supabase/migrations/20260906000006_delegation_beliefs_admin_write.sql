-- Allows admins to save new Delegation Beliefs config/question versions
-- directly (plain table writes from a Server Action), matching the
-- pattern already used for assessments/questions (assessments_write_admin
-- / questions_write_admin in 20260829000003_rls_policies.sql). Missed when
-- delegation_beliefs_config/questions were first created -- they only had
-- a read policy, since nothing wrote to them from the app yet at that
-- point.

create policy "admins write delegation beliefs config"
  on public.delegation_beliefs_config for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins write delegation beliefs questions"
  on public.delegation_beliefs_questions for all
  using (public.is_admin())
  with check (public.is_admin());
