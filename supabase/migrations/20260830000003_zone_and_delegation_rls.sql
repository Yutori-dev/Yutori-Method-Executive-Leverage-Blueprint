-- RLS for Milestone 2 tables.
--
-- participant_responsibilities and priority_delegation_opportunities get
-- SELECT-only policies for participants -- deliberately no insert/update/
-- delete policy at all, because every write to these two tables must go
-- through the SECURITY DEFINER functions in the previous migration, which
-- re-derive matrix_cell/macro_zone/leverage_level_snapshot themselves
-- rather than trusting a client-submitted value (task instructions
-- section 21). The functions bypass RLS as definer, so this doesn't block
-- them -- it only blocks a participant from writing these tables directly.

alter table public.responsibilities enable row level security;
alter table public.zone_matrix_cells enable row level security;
alter table public.participant_responsibilities enable row level security;
alter table public.priority_delegation_opportunities enable row level security;
alter table public.assessment_scoring_rules enable row level security;
alter table public.assessment_results enable row level security;

-- responsibilities: same shape as assessments/questions in Milestone 1.
create policy responsibilities_select on public.responsibilities
  for select using (active = true or public.is_admin());

create policy responsibilities_write_admin on public.responsibilities
  for all using (public.is_admin()) with check (public.is_admin());

-- zone_matrix_cells: readable so the UI can render cell names/explanations;
-- leverage_level on responsibilities is a separate column and is never
-- selected by participant-facing queries regardless of this policy.
create policy zone_matrix_cells_select on public.zone_matrix_cells
  for select using (active = true or public.is_admin());

create policy zone_matrix_cells_write_admin on public.zone_matrix_cells
  for all using (public.is_admin()) with check (public.is_admin());

-- participant_responsibilities: read-only for the owning participant.
create policy participant_responsibilities_select on public.participant_responsibilities
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = participant_responsibilities.participant_session_id
        and ps.participant_id = auth.uid()
    )
  );

-- priority_delegation_opportunities: read-only for the owning participant.
create policy priority_delegation_opportunities_select on public.priority_delegation_opportunities
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = priority_delegation_opportunities.participant_session_id
        and ps.participant_id = auth.uid()
    )
  );

-- assessment_scoring_rules: configuration, admin-only. Participants never
-- need to read scoring thresholds directly -- the calculated result comes
-- back through assessment_results instead.
create policy assessment_scoring_rules_admin_only on public.assessment_scoring_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- assessment_results: read-only for the owning participant, written only by
-- calculate_delegation_readiness().
create policy assessment_results_select on public.assessment_results
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      where ps.id = assessment_results.participant_session_id
        and ps.participant_id = auth.uid()
    )
  );
