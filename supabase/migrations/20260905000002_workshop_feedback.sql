-- Final Workshop Feedback / Review step (client spec round 4). Admin-
-- released, mirrors the architecture_revealed / zone_of_investment_revealed
-- boolean + RPC pattern already used three times in this app.

alter table public.sessions
  add column workshop_feedback_released boolean not null default false;

create table public.workshop_feedback (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null unique references public.participant_sessions (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  written_feedback text,
  permission text not null check (permission in ('named', 'anonymous')),
  submitted_at timestamptz not null default now()
);

alter table public.workshop_feedback enable row level security;

-- Participants read only their own submission (e.g. to show the thank-you
-- screen again if they revisit); all writes go through submit_workshop_feedback
-- below, so no participant-facing insert/update policy is needed.
create policy "participants read own workshop feedback"
  on public.workshop_feedback for select
  using (
    exists (
      select 1 from public.participant_sessions ps
      where ps.id = workshop_feedback.participant_session_id
        and ps.participant_id = auth.uid()
    )
  );

create policy "admins read all workshop feedback"
  on public.workshop_feedback for select
  using (public.is_admin());

-- Singleton settings row (client answered "make it admin-editable" for the
-- Final Feedback thank-you screen's diagnostic-follow-up link). The `id`
-- check constraint keeps this to exactly one row.
create table public.workshop_feedback_settings (
  id boolean primary key default true check (id),
  diagnostic_follow_up_url text
);

insert into public.workshop_feedback_settings (id) values (true);

alter table public.workshop_feedback_settings enable row level security;

create policy "anyone can read workshop feedback settings"
  on public.workshop_feedback_settings for select
  using (true);

-- admin_release_workshop_feedback: mirrors admin_reveal_architecture exactly.
create or replace function public.admin_release_workshop_feedback(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can release workshop feedback.';
  end if;

  update public.sessions set workshop_feedback_released = true where id = p_session_id;
end;
$$;

-- submit_workshop_feedback: own-participant-session-only upsert. Rating and
-- permission are re-validated here (not just relying on the column check
-- constraints) so the error message is meaningful to the caller.
create or replace function public.submit_workshop_feedback(
  p_participant_session_id uuid,
  p_rating smallint,
  p_written_feedback text,
  p_permission text
)
returns public.workshop_feedback
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.workshop_feedback;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user.';
  end if;

  if not exists (
    select 1 from public.participant_sessions
    where id = p_participant_session_id and participant_id = auth.uid()
  ) then
    raise exception 'Not your session.';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  if p_permission not in ('named', 'anonymous') then
    raise exception 'Invalid permission value.';
  end if;

  insert into public.workshop_feedback (participant_session_id, rating, written_feedback, permission)
  values (p_participant_session_id, p_rating, nullif(trim(coalesce(p_written_feedback, '')), ''), p_permission)
  on conflict (participant_session_id) do update
    set rating = excluded.rating,
        written_feedback = excluded.written_feedback,
        permission = excluded.permission
  returning * into v_row;

  return v_row;
end;
$$;

-- save_workshop_feedback_settings: admin-only, updates the singleton row.
create or replace function public.save_workshop_feedback_settings(p_diagnostic_follow_up_url text)
returns public.workshop_feedback_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.workshop_feedback_settings;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can edit workshop feedback settings.';
  end if;

  update public.workshop_feedback_settings
  set diagnostic_follow_up_url = nullif(trim(coalesce(p_diagnostic_follow_up_url, '')), '')
  where id = true
  returning * into v_row;

  return v_row;
end;
$$;
