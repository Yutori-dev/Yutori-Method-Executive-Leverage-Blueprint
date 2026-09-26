-- Slice 1, full rollout: the remaining ~13 downstream tables keyed by
-- participant_session_id move to the same sibling-read model already
-- verified live on participants/participant_sessions. Mechanical -- same
-- predicate everywhere via the existing can_read_participant_session()
-- helper -- except architecture_recommendations, which has an extra
-- reveal-gate clause that must be preserved, not just swapped out.
--
-- Every "admins read all X" companion policy is left as-is (redundant
-- with the helper's own is_admin() check, but harmless, and touching it
-- isn't necessary for this rollout). Write policies are untouched --
-- self-scoped writes only, unchanged.

create policy "sibling can read delegation beliefs responses"
  on public.delegation_beliefs_responses for select
  using (public.can_read_participant_session(participant_session_id));

create policy "sibling can read delegation beliefs results"
  on public.delegation_beliefs_results for select
  using (public.can_read_participant_session(participant_session_id));

create policy "sibling can read pressure test"
  on public.priority_delegation_pressure_test for select
  using (public.can_read_participant_session(participant_session_id));

create policy "sibling can read executive support audit responses"
  on public.executive_support_audit_responses for select
  using (public.can_read_participant_session(participant_session_id));

create policy "sibling can read executive support audit results"
  on public.executive_support_audit_results for select
  using (public.can_read_participant_session(participant_session_id));

create policy "sibling can read workshop feedback"
  on public.workshop_feedback for select
  using (public.can_read_participant_session(participant_session_id));

drop policy if exists participant_reflections_select on public.participant_reflections;
create policy participant_reflections_select on public.participant_reflections
  for select using (public.can_read_participant_session(participant_session_id));

drop policy if exists follow_up_interests_select on public.follow_up_interests;
create policy follow_up_interests_select on public.follow_up_interests
  for select using (public.can_read_participant_session(participant_session_id));

drop policy if exists participant_module_progress_select on public.participant_module_progress;
create policy participant_module_progress_select on public.participant_module_progress
  for select using (public.can_read_participant_session(participant_session_id));

drop policy if exists responses_select on public.responses;
create policy responses_select on public.responses
  for select using (public.can_read_participant_session(participant_session_id));

drop policy if exists participant_responsibilities_select on public.participant_responsibilities;
create policy participant_responsibilities_select on public.participant_responsibilities
  for select using (public.can_read_participant_session(participant_session_id));

drop policy if exists priority_delegation_opportunities_select on public.priority_delegation_opportunities;
create policy priority_delegation_opportunities_select on public.priority_delegation_opportunities
  for select using (public.can_read_participant_session(participant_session_id));

drop policy if exists assessment_results_select on public.assessment_results;
create policy assessment_results_select on public.assessment_results
  for select using (public.can_read_participant_session(participant_session_id));

-- architecture_recommendations: preserve the existing reveal-gate --
-- widening ownership must not also widen what's visible before the
-- facilitator has actually revealed it.
drop policy if exists architecture_recommendations_select on public.architecture_recommendations;
create policy architecture_recommendations_select on public.architecture_recommendations
  for select using (
    public.is_admin()
    or (
      public.can_read_participant_session(participant_session_id)
      and exists (
        select 1 from public.participant_sessions ps
        join public.sessions s on s.id = ps.session_id
        where ps.id = architecture_recommendations.participant_session_id
          and s.architecture_revealed = true
      )
    )
  );
