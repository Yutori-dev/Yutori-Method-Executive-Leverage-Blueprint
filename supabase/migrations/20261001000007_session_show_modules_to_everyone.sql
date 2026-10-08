-- Per-session switch: "show every ticked module to everyone in this session".
-- Role filtering (assistant-only / visionary-only modules) is for sessions
-- that mix both groups. The client runs separate sessions per audience, where
-- the filter only ever hides things (e.g. a login registered as an assistant
-- opening a visionary session saw no modules at all). With the switch on, a
-- participant sees exactly the modules ticked for the session.
alter table public.sessions
  add column if not exists show_modules_to_everyone boolean not null default false;

-- The current single-audience Lab sessions and test sessions.
update public.sessions
set show_modules_to_everyone = true
where name ilike '%Lab%' or name ilike '%Assistant Test%';
