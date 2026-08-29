-- White Whale and Leadership Wiring become individually facilitator-
-- unlocked activities (client Implementation Specifications) rather than
-- always-visible sections bundled inline on the Operating Altitude module
-- page. Mirrors the exact pattern already built for the Architecture
-- reveal and the Zone of Investment reveal: one boolean gate column per
-- activity + a narrow admin-only RPC pair.

alter table public.sessions
  add column white_whale_unlocked boolean not null default false,
  add column leadership_wiring_unlocked boolean not null default false;

comment on column public.sessions.white_whale_unlocked is
  'Facilitator-controlled, cohort-wide, one-way. Gates the White Whale '
  'activity within the Operating Altitude module -- it comes after the '
  'Executive Leverage Diagnostic and before Leadership Wiring.';

comment on column public.sessions.leadership_wiring_unlocked is
  'Facilitator-controlled, cohort-wide, one-way. Gates the Leadership '
  'Wiring activity -- the last of the three Operating Altitude activities; '
  'completing it marks the whole module complete.';

-- Admin-editable, versioned copy for both activities -- neither has
-- anywhere to live today (hardcoded JSX strings in OperatingAltitudeFlow),
-- same "insert new version, admin-write RLS" shape as assessments.

create table public.white_whale_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  header text not null,
  setup_copy text not null,
  prompt text not null,
  placeholder_text text not null,
  privacy_note text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.leadership_wiring_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  header text not null,
  prompt text not null,
  visionary_description text not null,
  integrator_description text not null,
  hybrid_description text not null,
  dashboard_note text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.white_whale_config enable row level security;
alter table public.leadership_wiring_config enable row level security;

create policy white_whale_config_select on public.white_whale_config
  for select using (active = true or public.is_admin());
create policy white_whale_config_write_admin on public.white_whale_config
  for all using (public.is_admin()) with check (public.is_admin());

create policy leadership_wiring_config_select on public.leadership_wiring_config
  for select using (active = true or public.is_admin());
create policy leadership_wiring_config_write_admin on public.leadership_wiring_config
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.white_whale_config (version, header, setup_copy, prompt, placeholder_text, privacy_note) values (
  1,
  'YOUR WHITE WHALE',
  'Think about something meaningful that has remained on the horizon because other demands continually take priority. Your White Whale might be a project, initiative, opportunity or personal ambition. It should be something that matters deeply, requires meaningful investment from you and would materially change something that matters if you had the capacity to pursue it.',
  'What is your White Whale?',
  'Describe your White Whale in a few sentences.',
  'Your response is private and will become part of your Executive Leverage Blueprint™.'
);

insert into public.leadership_wiring_config (
  version, header, prompt, visionary_description, integrator_description, hybrid_description, dashboard_note
) values (
  1,
  'HOW ARE YOU NATURALLY WIRED?',
  'Based on what we just explored, which best reflects your natural wiring?',
  'I naturally gravitate toward possibility, future direction, ideas, innovation and creating momentum.',
  'I naturally gravitate toward prioritizing, sequencing, translating direction into execution and creating follow-through.',
  'Both ways of operating feel genuinely natural to me, without one consistently requiring more effort or conscious override than the other.',
  'Participants'' self-identified natural leadership wiring based on the Visionary-Integrator framework introduced in the workshop. This reflects how participants believe they naturally create value, rather than every responsibility they are currently required or capable of carrying.'
);
