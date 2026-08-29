-- RLS for Milestone 3 tables. Same shape as Milestone 2: participants get
-- read-only access to their own architecture_recommendations row; all
-- writes happen through the SECURITY DEFINER functions in the previous
-- migration, which re-derive every value themselves.

alter table public.recommendation_rules enable row level security;
alter table public.architecture_recommendations enable row level security;

create policy recommendation_rules_admin_only on public.recommendation_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- A participant can only read their own row once the facilitator has
-- revealed architecture for that session -- otherwise calculate_architecture_
-- recommendation()'s "Your Blueprint is ready" holding state could be
-- bypassed by querying this table directly instead of going through the
-- app (the same class of gap Milestone 2 closed for matrix_cell/macro_zone).
create policy architecture_recommendations_select on public.architecture_recommendations
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_sessions ps
      join public.sessions s on s.id = ps.session_id
      where ps.id = architecture_recommendations.participant_session_id
        and ps.participant_id = auth.uid()
        and s.architecture_revealed = true
    )
  );
