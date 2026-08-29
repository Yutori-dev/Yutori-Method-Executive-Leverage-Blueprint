-- Zone of Investment -- real content (client Implementation Specification).
-- Resolves content dependency B (Responsibility Library) and content
-- dependency C (the 9-cell Zone Matrix mapping) with the client's own
-- exact labels/order/mapping. Ships to every environment, like
-- 20260829000005_seed_modules.sql -- this is real approved content, not
-- placeholder, so it does not belong in the dev-only seed.sql.
--
-- leverage_level is left null for every row -- the client's own spec text
-- defers that hidden classification explicitly ("will be specified when
-- the leverage-level mapping is built"); see the schema migration's
-- comments and docs/ARCHITECTURE_DECISIONS.md for how the rest of the app
-- treats a null classification as a controlled-pending case.

insert into public.responsibilities (key, label, leverage_level, sort_order, active, version, is_placeholder) values
  ('developing_strategy', 'Developing strategy', null, 1, true, 1, false),
  ('managing_people', 'Managing people', null, 2, true, 1, false),
  ('setting_goals_performance_management', 'Setting goals / performance management', null, 3, true, 1, false),
  ('analyzing_financials', 'Analyzing financials', null, 4, true, 1, false),
  ('business_development_partnerships', 'Business development / building partnerships', null, 5, true, 1, false),
  ('closing_deals', 'Closing deals', null, 6, true, 1, false),
  ('designing_decks_narratives', 'Designing decks / narratives', null, 7, true, 1, false),
  ('optimizing_workflows', 'Optimizing workflows', null, 8, true, 1, false),
  ('facilitating_planning_meetings', 'Facilitating planning meetings', null, 9, true, 1, false),
  ('managing_vendors', 'Managing vendors', null, 10, true, 1, false),
  ('building_processes', 'Building processes', null, 11, true, 1, false),
  ('reviewing_performance_data', 'Reviewing performance data', null, 12, true, 1, false),
  ('building_roadmaps', 'Building roadmaps', null, 13, true, 1, false),
  ('scheduling_and_logistics', 'Scheduling and logistics', null, 14, true, 1, false),
  ('thought_leadership_pr', 'Thought leadership / PR', null, 15, true, 1, false),
  ('enforcing_deadlines_standards', 'Enforcing deadlines & standards', null, 16, true, 1, false),
  ('setting_influencing_culture', 'Setting/influencing culture', null, 17, true, 1, false),
  ('designing_new_product_service_offerings', 'Designing new product/service offerings', null, 18, true, 1, false),
  ('setting_enforcing_budget', 'Setting/enforcing a budget', null, 19, true, 1, false),
  ('problem_solving', 'Problem solving', null, 20, true, 1, false),
  ('providing_direct_client_support', 'Providing direct client support', null, 21, true, 1, false);

-- Nine-cell mapping. macro_zone: investment = {Genius, Strength, Potential},
-- ambiguity = {Excellence, Tolerable Competence, Aspiration},
-- vulnerability = {Incompetence, Exploration, Drain}.
insert into public.zone_matrix_cells (competency_level, passion_level, cell_name, macro_zone, version, active, is_placeholder) values
  ('low', 'low', 'Zone of Incompetence', 'vulnerability', 2, true, false),
  ('low', 'medium', 'Zone of Exploration', 'vulnerability', 2, true, false),
  ('low', 'high', 'Zone of Aspiration', 'ambiguity', 2, true, false),
  ('medium', 'low', 'Zone of Drain', 'vulnerability', 2, true, false),
  ('medium', 'medium', 'Zone of Tolerable Competence', 'ambiguity', 2, true, false),
  ('medium', 'high', 'Zone of Potential', 'investment', 2, true, false),
  ('high', 'low', 'Zone of Excellence', 'ambiguity', 2, true, false),
  ('high', 'medium', 'Zone of Strength', 'investment', 2, true, false),
  ('high', 'high', 'Zone of Genius', 'investment', 2, true, false);
