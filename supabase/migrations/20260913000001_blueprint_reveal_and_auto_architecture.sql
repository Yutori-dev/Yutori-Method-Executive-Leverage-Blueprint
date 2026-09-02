-- Sep 2 client feedback: the Blueprint gets its own admin-controlled
-- reveal (mirrors architecture_revealed / workshop_feedback_released),
-- and Architecture's own reveal stops being a separate manual step --
-- unlocking the Architecture module now reveals it automatically, so the
-- standalone "Architecture reveal" admin control goes away.

alter table public.sessions
  add column blueprint_revealed boolean not null default false;

create or replace function public.admin_reveal_blueprint(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reveal the Blueprint.';
  end if;

  update public.sessions
  set blueprint_revealed = true
  where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;

-- admin_unlock_next_module: unchanged advancement logic, plus
-- architecture_revealed flips to true in the same update whenever the
-- module being unlocked is Architecture itself (client feedback 2026-09:
-- "we do not need the architecture reveal button, the functionality of
-- that should be automatically unlocked when you click Unlock Architecture
-- Module"). admin_reveal_architecture itself is left in place, unused.
create or replace function public.admin_unlock_next_module(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_sort integer;
  v_next_module_id uuid;
  v_next_module_key text;
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can unlock modules.';
  end if;

  select m.sort_order into v_current_sort
  from public.sessions s
  left join public.modules m on m.id = s.active_module_id
  where s.id = p_session_id;

  select id, key into v_next_module_id, v_next_module_key
  from public.modules
  where active = true
    and requires_live_workshop = false
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
