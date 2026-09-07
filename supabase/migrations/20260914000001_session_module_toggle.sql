-- Per-session module toggle (client request 2026-09-07): a shorter workshop
-- may skip specific modules (e.g. a 90-minute session dropping two). The
-- `modules` table itself stays a global, shared catalog -- this adds a
-- per-session override on top of it rather than duplicating module rows
-- per session.
alter table public.sessions
  add column disabled_module_keys text[] not null default '{}';

comment on column public.sessions.disabled_module_keys is
  'Module keys disabled for this specific session only. Validated at the '
  'application layer against modules.key (excluding requires_live_workshop '
  'modules, which are never toggleable here -- that gating is separate). '
  'Empty array = every module runs, the default/existing behavior.';

-- admin_unlock_next_module: skip modules disabled for this session when
-- finding "next module to unlock", same auto-reveal-architecture behavior
-- as before (20260913000001_blueprint_reveal_and_auto_architecture.sql).
create or replace function public.admin_unlock_next_module(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_sort integer;
  v_disabled text[];
  v_next_module_id uuid;
  v_next_module_key text;
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can unlock modules.';
  end if;

  select m.sort_order, s.disabled_module_keys into v_current_sort, v_disabled
  from public.sessions s
  left join public.modules m on m.id = s.active_module_id
  where s.id = p_session_id;

  select id, key into v_next_module_id, v_next_module_key
  from public.modules
  where active = true
    and requires_live_workshop = false
    and not (key = any(coalesce(v_disabled, '{}')))
    and (v_current_sort is null or sort_order > v_current_sort)
  order by sort_order asc
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
