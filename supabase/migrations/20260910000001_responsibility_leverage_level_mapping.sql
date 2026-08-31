-- Responsibility -> Leverage Level Mapping (client "Developer Implementation
-- Guide -- Final", 2026-08-31). Resolves the content dependency flagged
-- repeatedly since the Zone of Investment rebuild
-- (docs/CLIENT_QUESTIONS.md item 6): responsibilities.leverage_level has
-- been null for all 21 real responsibilities until now, which meant the
-- Priority Leverage Opportunities Reveal and the Executive Support
-- Architecture engine always hit their controlled "pending" fallback for
-- every real participant. Both are already fully built and tested against
-- controlled data (see docs/CLIENT_FEEDBACK_ROUND4.md) -- this migration
-- is what makes them show real results.
--
-- Keyed by sort_order (1-21), not label text, since it's unambiguous and
-- the client's numbered list (01-21) matches this app's sort_order
-- position-for-position -- confirmed against the live table before
-- writing this migration. A handful of labels here differ trivially in
-- punctuation from the client's spec text (e.g. "Scheduling and logistics"
-- here vs. "Scheduling / logistics" in the spec) -- same responsibility,
-- not renamed, only the leverage_level classification is being set.
--
-- A plain update, not a new version: this fills in a previously-null
-- column on the current, already-real (is_placeholder = false) rows
-- rather than replacing content, and no participant has yet had a
-- non-null leverage_level_snapshot to preserve (every snapshot captured
-- so far is null, since the source column has always been null until now).
--
-- Distribution check per the spec: 2 Execution / 4 Orchestration /
-- 14 Strategic / 1 Systems = 21. Verified to match after this migration.

update public.responsibilities set leverage_level = 'strategic' where sort_order = 1;  -- Developing strategy
update public.responsibilities set leverage_level = 'strategic' where sort_order = 2;  -- Managing people
update public.responsibilities set leverage_level = 'strategic' where sort_order = 3;  -- Setting goals / performance management
update public.responsibilities set leverage_level = 'strategic' where sort_order = 4;  -- Analyzing financials
update public.responsibilities set leverage_level = 'strategic' where sort_order = 5;  -- Business development / building partnerships
update public.responsibilities set leverage_level = 'strategic' where sort_order = 6;  -- Closing deals
update public.responsibilities set leverage_level = 'strategic' where sort_order = 7;  -- Designing decks / narratives
update public.responsibilities set leverage_level = 'systems'   where sort_order = 8;  -- Optimizing workflows
update public.responsibilities set leverage_level = 'orchestration' where sort_order = 9;  -- Facilitating planning meetings
update public.responsibilities set leverage_level = 'orchestration' where sort_order = 10; -- Managing vendors
update public.responsibilities set leverage_level = 'orchestration' where sort_order = 11; -- Building processes
update public.responsibilities set leverage_level = 'strategic' where sort_order = 12; -- Reviewing performance data
update public.responsibilities set leverage_level = 'strategic' where sort_order = 13; -- Building roadmaps
update public.responsibilities set leverage_level = 'execution' where sort_order = 14; -- Scheduling and logistics
update public.responsibilities set leverage_level = 'strategic' where sort_order = 15; -- Thought leadership / PR
update public.responsibilities set leverage_level = 'orchestration' where sort_order = 16; -- Enforcing deadlines & standards
update public.responsibilities set leverage_level = 'strategic' where sort_order = 17; -- Setting/influencing culture
update public.responsibilities set leverage_level = 'strategic' where sort_order = 18; -- Designing new product/service offerings
update public.responsibilities set leverage_level = 'strategic' where sort_order = 19; -- Setting/enforcing a budget
update public.responsibilities set leverage_level = 'strategic' where sort_order = 20; -- Problem solving
update public.responsibilities set leverage_level = 'execution' where sort_order = 21; -- Providing direct client support

do $$
declare
  v_exec integer;
  v_orch integer;
  v_strat integer;
  v_sys integer;
  v_null integer;
begin
  select count(*) filter (where leverage_level = 'execution'),
         count(*) filter (where leverage_level = 'orchestration'),
         count(*) filter (where leverage_level = 'strategic'),
         count(*) filter (where leverage_level = 'systems'),
         count(*) filter (where leverage_level is null)
    into v_exec, v_orch, v_strat, v_sys, v_null
  from public.responsibilities
  where is_placeholder = false and active = true;

  if v_exec <> 2 or v_orch <> 4 or v_strat <> 14 or v_sys <> 1 or v_null <> 0 then
    raise exception 'Distribution check failed: execution=%, orchestration=%, strategic=%, systems=%, null=% (expected 2/4/14/1/0)',
      v_exec, v_orch, v_strat, v_sys, v_null;
  end if;
end $$;
