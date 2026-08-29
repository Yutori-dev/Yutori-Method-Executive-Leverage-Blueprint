-- Zone of Investment rebuild (client Implementation Specification):
-- facilitator-gated reveal of the personalized matrix, a "reveal viewed"
-- dashboard stat, and real content that leaves the hidden leverage_level
-- classification genuinely unknown for now (the client's own spec text
-- defers it: "That classification will be specified when the
-- leverage-level mapping is built") -- so leverage_level, and the snapshot
-- copied from it, both become nullable rather than being given an invented
-- value. See docs/ARCHITECTURE_DECISIONS.md for the full reasoning.

alter table public.sessions
  add column zone_of_investment_revealed boolean not null default false;

comment on column public.sessions.zone_of_investment_revealed is
  'Facilitator-controlled, cohort-wide, one-way -- mirrors architecture_revealed. '
  'Gates the Zone of Investment module''s own presentation of the personalized '
  'matrix; see admin_reveal_zone_of_investment().';

alter table public.participant_sessions
  add column zone_of_investment_viewed_at timestamptz;

comment on column public.participant_sessions.zone_of_investment_viewed_at is
  'Set once, first time this participant''s UI renders the revealed personalized '
  'matrix -- a view stat the facilitator dashboard asks for that nothing else in '
  'the app tracks (view, not completion). Never overwritten after first set.';

alter table public.responsibilities
  alter column leverage_level drop not null;

alter table public.priority_delegation_opportunities
  alter column leverage_level_snapshot drop not null;

comment on column public.priority_delegation_opportunities.leverage_level_snapshot is
  'Copied from responsibilities.leverage_level at selection time and never '
  're-read from the live responsibility row afterward, so a later edit to '
  'the responsibility library cannot rewrite a participant''s historical '
  'result. Nullable because leverage_level itself can be null for content '
  'whose hidden classification has not been supplied yet -- '
  'calculate_architecture_recommendation() treats a null snapshot as a '
  'controlled-pending case, never a guessed signal.';
