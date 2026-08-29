-- A participant landing on /join/[code] is not authenticated yet, so the
-- sessions RLS policy (admin or already-enrolled participant) correctly
-- blocks them from reading the session row. This narrowly-scoped function
-- exposes only the handful of fields needed to greet them by session name,
-- for exactly the join code they already possess -- it is not a listing
-- endpoint and never returns archived sessions.

create or replace function public.get_session_by_join_code(p_join_code text)
returns table (
  name text,
  organization text,
  event_date date,
  format text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.organization, s.event_date, s.format, s.status
  from public.sessions s
  where s.join_code = p_join_code
    and s.status <> 'archived';
$$;

grant execute on function public.get_session_by_join_code(text) to anon, authenticated;
