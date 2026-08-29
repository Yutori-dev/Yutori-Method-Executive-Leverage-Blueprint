-- Executive Leverage Diagnostic (TM) -- Developer Implementation
-- Specification V1. Additive columns only, on the existing configurable
-- activity engine (questions/assessment_results) -- no new tables needed.
-- assessment_scoring_rules already fits the "percentage threshold ->
-- profile label/copy" requirement directly.

-- Per-question result metadata specific to how a scored diagnostic reports
-- itself. First-class columns rather than the schemaless questions.config
-- jsonb: this isn't a new input *type* (still multiple_choice), it's a
-- small set of well-known fields the admin config screen and the scoring
-- RPC both need to read/write reliably, the same way answer_options.
-- score_value is already a first-class column rather than living in
-- metadata jsonb.
alter table public.questions
  add column scored boolean not null default true,
  add column dashboard_visible boolean not null default true,
  add column constraint_label text,
  add column interpretation_copy text,
  add column tie_break_priority integer;

comment on column public.questions.scored is
  'False for context-only questions (e.g. the Executive Leverage '
  'Diagnostic''s baseline capacity question and Rock-completion question) '
  '-- excluded from scoring but still stored and dashboard-visible.';

comment on column public.questions.tie_break_priority is
  'Lower wins when two scored questions tie for lowest score. Only '
  'meaningful for scored questions within one assessment; null otherwise.';

-- Calculated-result storage for a percentage-scored diagnostic with a
-- "three lowest-scoring questions" constraint output. dimension_scores
-- (already exists) holds the per-question 0-4 score keyed by
-- constraint_label; these add the total/percentage/ordered-constraint
-- snapshot and a genuine start timestamp.
alter table public.assessment_results
  add column total_points integer,
  add column internal_percentage numeric,
  add column strongest_constraints jsonb,
  add column started_at timestamptz;

comment on column public.assessment_results.strongest_constraints is
  'Snapshot of [{label, interpretation}, ...] for the three lowest-scoring '
  'questions at calculation time -- never a live re-join, so a later admin '
  'edit to interpretation copy can''t retroactively rewrite a past '
  'participant''s already-displayed result.';

comment on column public.assessment_results.started_at is
  'Set once from the earliest response to this assessment''s questions, '
  'never overwritten on recalculation.';
