-- Milestone 3: recommendation engine schema.
--
-- Same shape as Milestone 2's scoring tables: recommendation_rules exists
-- as a real, versioned, admin-editable table (content dependency F, brief
-- section 8.5) but ships empty in every environment. Yutori has not
-- supplied the final decision table, so calculate_architecture_recommendation()
-- always falls back to the brief's own specified fallback copy (section 24)
-- instead of inventing a named recommendation.

create table public.recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  priority integer not null default 0,
  condition jsonb not null,
  primary_result text not null,
  primary_role text,
  secondary_result text,
  explanation_template text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.recommendation_rules.condition is
  'Structured match condition, e.g. {"primary_signal_leverage_level":"orchestration"}. '
  'Evaluated by calculate_architecture_recommendation() -- see that function for '
  'the exact matching semantics it implements today.';

create index recommendation_rules_active_idx on public.recommendation_rules (active, priority);

-- ---------------------------------------------------------------------------
-- architecture_recommendations: one row per participant_session, matching
-- the brief's ArchitectureRecommendation entity (section 20) plus the
-- Architecture Reaction fields (section 9), which are tightly coupled to
-- the same reveal moment.
-- ---------------------------------------------------------------------------
create table public.architecture_recommendations (
  id uuid primary key default gen_random_uuid(),
  participant_session_id uuid not null unique references public.participant_sessions (id) on delete cascade,
  primary_signal_leverage_level text check (
    primary_signal_leverage_level in ('execution', 'orchestration', 'strategic', 'systems')
  ),
  is_tied boolean not null default false,
  primary_result text,
  primary_role text,
  secondary_result text,
  rationale text not null,
  supporting_signals jsonb not null default '[]'::jsonb,
  rules_version integer not null,
  calculated_at timestamptz not null default now(),
  reaction text check (reaction in ('yes', 'mostly', 'not_yet')),
  reaction_note text,
  reaction_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.architecture_recommendations.primary_signal_leverage_level is
  'Majority leverage_level_snapshot across the 3 priority_delegation_opportunities '
  '(brief section 8.1: 2+ matching = a strong primary signal). Null when all three '
  'differ (is_tied = true, a 1/1/1 split) -- never guessed.';

comment on column public.architecture_recommendations.supporting_signals is
  'The 3 priority opportunities'' labels and leverage snapshots, always stored so '
  'the rationale never hides contradictory signals (brief section 8.4).';

create trigger architecture_recommendations_set_updated_at
  before update on public.architecture_recommendations
  for each row execute function public.set_updated_at();
