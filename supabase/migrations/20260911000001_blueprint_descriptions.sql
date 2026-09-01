-- Blueprint responsibility descriptions (client "Blueprint Generation, Display
-- Logic & Dynamic Content" guide, 2026-09-01, section 11). Each of the 21
-- real responsibilities needs a short, fixed, participant-facing description
-- for the new Blueprint's "Ownership to Transfer" and "Highest Value Focus"
-- sections -- distinct from the existing (always-null, unused) `description`
-- column, which is scoped to the Zone of Investment self-mapping screen, a
-- different audience/moment ("what is this while I'm choosing" vs. "what did
-- this mean, after everything is scored"). Kept separate so a future edit to
-- one doesn't silently change the other.
--
-- Keyed by sort_order, same convention as
-- 20260910000001_responsibility_leverage_level_mapping.sql.
--
-- A plain update, not a new version: filling a previously-null column on
-- current, already-real (is_placeholder = false) rows, not replacing content.

alter table public.responsibilities add column blueprint_description text;

update public.responsibilities set blueprint_description = 'Set direction, make strategic choices and define where the business goes next.' where sort_order = 1;  -- Developing strategy
update public.responsibilities set blueprint_description = 'Lead people, make talent decisions and drive performance and accountability.' where sort_order = 2;  -- Managing people
update public.responsibilities set blueprint_description = 'Define outcomes, set expectations and evaluate progress and performance.' where sort_order = 3;  -- Setting goals / performance management
update public.responsibilities set blueprint_description = 'Interpret financial performance and use it to guide business decisions.' where sort_order = 4;  -- Analyzing financials
update public.responsibilities set blueprint_description = 'Build relationships and partnerships that create growth and strategic opportunity.' where sort_order = 5;  -- Business development / building partnerships
update public.responsibilities set blueprint_description = 'Lead negotiations and convert opportunities into committed business.' where sort_order = 6;  -- Closing deals
update public.responsibilities set blueprint_description = 'Shape the story and framing that drives audience understanding and action.' where sort_order = 7;  -- Designing decks / narratives
update public.responsibilities set blueprint_description = 'Redesign recurring work to reduce friction, manual effort and dependency.' where sort_order = 8;  -- Optimizing workflows
update public.responsibilities set blueprint_description = 'Structure planning conversations, align inputs and drive clear decisions and next steps.' where sort_order = 9;  -- Facilitating planning meetings
update public.responsibilities set blueprint_description = 'Coordinate vendors, expectations, deliverables and follow-through against agreed outcomes.' where sort_order = 10; -- Managing vendors
update public.responsibilities set blueprint_description = 'Design repeatable ways of working across people, steps and handoffs.' where sort_order = 11; -- Building processes
update public.responsibilities set blueprint_description = 'Interpret performance signals and determine implications, priorities and action.' where sort_order = 12; -- Reviewing performance data
update public.responsibilities set blueprint_description = 'Translate direction into sequenced priorities, milestones and execution paths.' where sort_order = 13; -- Building roadmaps
update public.responsibilities set blueprint_description = 'Coordinate calendars, travel and logistics so commitments happen smoothly.' where sort_order = 14; -- Scheduling and logistics
update public.responsibilities set blueprint_description = 'Shape external positioning and represent the ideas and perspective of the business.' where sort_order = 15; -- Thought leadership / PR
update public.responsibilities set blueprint_description = 'Track commitments, uphold standards and drive accountability and follow-through.' where sort_order = 16; -- Enforcing deadlines & standards
update public.responsibilities set blueprint_description = 'Shape the behaviors, standards and norms that define how the company operates.' where sort_order = 17; -- Setting/influencing culture
update public.responsibilities set blueprint_description = 'Turn market insight and strategy into new offerings and value propositions.' where sort_order = 18; -- Designing new product/service offerings
update public.responsibilities set blueprint_description = 'Allocate resources, set financial guardrails and make budget trade-offs.' where sort_order = 19; -- Setting/enforcing a budget
update public.responsibilities set blueprint_description = 'Diagnose complex issues, weigh trade-offs and determine the path forward.' where sort_order = 20; -- Problem solving
update public.responsibilities set blueprint_description = 'Deliver defined client-facing support and resolve routine service needs.' where sort_order = 21; -- Providing direct client support

do $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from public.responsibilities
  where is_placeholder = false and active = true
    and (blueprint_description is null or blueprint_description = '');

  if v_missing <> 0 then
    raise exception 'blueprint_description missing on % real responsibility row(s)', v_missing;
  end if;
end $$;
