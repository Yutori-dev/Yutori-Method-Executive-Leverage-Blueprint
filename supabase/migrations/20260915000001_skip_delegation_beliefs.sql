-- Per-session override (client request 2026-09): skip the Delegation
-- Beliefs assessment for a shortened workshop while still requiring the
-- Priority Delegation Opportunities selection. Deliberately separate from
-- disabled_module_keys -- this is a sub-step inside the "delegation"
-- module, not a whole-module toggle, and only meaningful when "delegation"
-- itself isn't in disabled_module_keys.
alter table public.sessions
  add column skip_delegation_beliefs boolean not null default false;

comment on column public.sessions.skip_delegation_beliefs is
  'When true, the Delegation module skips straight to Priority Delegation '
  'Opportunities selection without requiring the Delegation Beliefs '
  'assessment first. Has no effect on the Executive Support Architecture '
  'calculation -- that reads priority_delegation_opportunities and '
  'executive_support_audit_results only, never delegation_beliefs_results '
  '(confirmed against calculate_executive_support_architecture).';
