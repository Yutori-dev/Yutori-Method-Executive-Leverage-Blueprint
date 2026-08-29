-- Seeds the module catalog with the dashboard progression named explicitly
-- in brief section 5.1. This is structural navigation data (names/order),
-- not the business content of any module, so it is safe to ship to every
-- environment rather than living in the dev-only seed.sql.

insert into public.modules (key, name, description, sort_order, requires_live_workshop) values
  ('operating_altitude', 'Operating Altitude', 'Leadership Leverage Diagnostic and Visionary/Integrator identification.', 1, false),
  ('current_structure', 'Current Structure', 'Zone of Investment: responsibility selection, competency and passion mapping.', 2, false),
  ('delegation', 'Delegation', 'Delegation Beliefs assessment and Priority Delegation Opportunity selection.', 3, false),
  ('leverage', 'Leverage', 'Executive Support Audit and leverage mapping reveal.', 4, false),
  ('architecture', 'Architecture', 'Personalized Executive Support Architecture recommendation and reveal.', 5, false),
  ('success', 'Success', 'Success vision and completed Blueprint.', 6, false),
  ('character_live', 'Character — Live Workshop', 'Detailed Character assessment, unlocked only in the later in-person workshop.', 7, true);
