-- (1) White Whale and Leadership Wiring become standalone modules, each with
--     its own completion state and each includable / skippable per session.
--     Operating Altitude is now the Executive Leverage Diagnostic on its own.
--     Their content tables and saved answers are untouched.
-- (2) Per-session module order: sessions.module_order is an ordered list of
--     module keys chosen when a session is created. NULL keeps the global
--     order exactly as before, so every existing session behaves as it did.
--
-- Nothing a participant has already saved changes. Completion states are
-- carried over, never removed (see the backfill below).

-- ---------------------------------------------------------------- (2) order
alter table public.sessions
  add column if not exists module_order text[];

comment on column public.sessions.module_order is
  'Module keys in the order participants complete them in this session. '
  'NULL = follow the global modules.sort_order. Modules not listed run after '
  'the listed ones in their global order.';

-- ---------------------------------------------------- (1) separate modules
do $$
declare
  v_oa_sort integer;
begin
  select sort_order into v_oa_sort from public.modules where key = 'operating_altitude';
  if v_oa_sort is null then return; end if;

  -- Only make room if the new modules do not exist yet (re-runnable).
  if not exists (select 1 from public.modules where key = 'white_whale') then
    -- Relative order of every existing module is preserved; the two new ones
    -- sit directly after Operating Altitude, where they used to run.
    -- sort_order is unique and checked row by row, so shift in two steps.
    update public.modules set sort_order = sort_order + 100000 where sort_order > v_oa_sort;
    update public.modules set sort_order = sort_order - 99998 where sort_order > 100000;

    insert into public.modules (key, name, description, sort_order, active, requires_live_workshop, audience) values
      ('white_whale', 'White Whale', 'The meaningful ambition that has stayed on the horizon.', v_oa_sort + 1, true, false, 'everyone'),
      ('leadership_wiring', 'Leadership Wiring', 'Visionary, Integrator or Hybrid: how you are naturally wired.', v_oa_sort + 2, true, false, 'everyone');
  end if;
end $$;

-- Sessions already running keep the experience they had: where Operating
-- Altitude is on, so are the two modules that used to live inside it; where
-- it is off they stay off.
update public.sessions s
set disabled_module_keys = (
  select coalesce(array_agg(distinct k), '{}')
  from unnest(coalesce(s.disabled_module_keys, '{}') || array['white_whale', 'leadership_wiring']) as k
)
where 'operating_altitude' = any(coalesce(s.disabled_module_keys, '{}'))
  and not ('white_whale' = any(coalesce(s.disabled_module_keys, '{}')));

-- A session whose facilitator already opened White Whale / Leadership Wiring
-- (the old separate unlock buttons) stays open at that point.
update public.sessions s
set active_module_id = (select id from public.modules where key = 'leadership_wiring')
where s.leadership_wiring_unlocked
  and s.active_module_id = (select id from public.modules where key = 'operating_altitude')
  and not ('leadership_wiring' = any(coalesce(s.disabled_module_keys, '{}')));

update public.sessions s
set active_module_id = (select id from public.modules where key = 'white_whale')
where s.white_whale_unlocked
  and s.active_module_id = (select id from public.modules where key = 'operating_altitude')
  and not ('white_whale' = any(coalesce(s.disabled_module_keys, '{}')));

-- --------------------------------------------------------------- backfill
-- Operating Altitude is complete once the diagnostic has been submitted.
insert into public.participant_module_progress (participant_session_id, module_id, status, started_at, completed_at)
select ar.participant_session_id, oa.id, 'complete', now(), now()
from public.assessment_results ar
join public.assessments a on a.id = ar.assessment_id and a.key = 'executive_leverage_diagnostic'
cross join (select id from public.modules where key = 'operating_altitude') oa
on conflict (participant_session_id, module_id) do update
  set status = 'complete', completed_at = coalesce(public.participant_module_progress.completed_at, now())
  where public.participant_module_progress.status <> 'complete';

-- White Whale is complete for everyone who already wrote their answer.
insert into public.participant_module_progress (participant_session_id, module_id, status, started_at, completed_at)
select pr.participant_session_id, ww.id, 'complete', now(), now()
from public.participant_reflections pr
cross join (select id from public.modules where key = 'white_whale') ww
where coalesce(trim(pr.white_whale), '') <> ''
on conflict (participant_session_id, module_id) do nothing;

-- Leadership Wiring is complete for everyone who already chose their wiring.
insert into public.participant_module_progress (participant_session_id, module_id, status, started_at, completed_at)
select ps.id, lw.id, 'complete', now(), now()
from public.participant_sessions ps
cross join (select id from public.modules where key = 'leadership_wiring') lw
where ps.self_identification is not null
on conflict (participant_session_id, module_id) do nothing;

-- --------------------------------------------- unlock-next honours the order
-- Same behaviour as before (skip disabled modules, opening Architecture also
-- reveals it) but "next" follows the session's own order when it has one.
create or replace function public.admin_unlock_next_module(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_disabled text[];
  v_order text[];
  v_active uuid;
  v_current_rank bigint;
  v_next_module_id uuid;
  v_next_module_key text;
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can unlock modules.';
  end if;

  select s.disabled_module_keys, s.module_order, s.active_module_id
    into v_disabled, v_order, v_active
  from public.sessions s
  where s.id = p_session_id;

  with ranked as (
    select m.id, row_number() over (order by coalesce(array_position(v_order, m.key), 1000000), m.sort_order) as rn
    from public.modules m
    where m.active = true
  )
  select r.rn into v_current_rank from ranked r where r.id = v_active;

  with ranked as (
    select m.id, m.key, m.requires_live_workshop,
           row_number() over (order by coalesce(array_position(v_order, m.key), 1000000), m.sort_order) as rn
    from public.modules m
    where m.active = true
  )
  select r.id, r.key into v_next_module_id, v_next_module_key
  from ranked r
  where r.requires_live_workshop = false
    and not (r.key = any(coalesce(v_disabled, '{}')))
    and (v_current_rank is null or r.rn > v_current_rank)
  order by r.rn asc
  limit 1;

  if v_next_module_id is null then
    select * into v_row from public.sessions where id = p_session_id;
    return v_row;
  end if;

  update public.sessions
  set active_module_id = v_next_module_id,
      architecture_revealed = case when v_next_module_key = 'architecture' then true else architecture_revealed end
  where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;
