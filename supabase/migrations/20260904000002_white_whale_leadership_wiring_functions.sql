-- admin_unlock_white_whale / admin_unlock_leadership_wiring mirror
-- admin_reveal_architecture and admin_reveal_zone_of_investment exactly:
-- is_admin() check, one boolean flip, one-way.

create or replace function public.admin_unlock_white_whale(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can unlock White Whale.';
  end if;

  update public.sessions
  set white_whale_unlocked = true
  where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_unlock_leadership_wiring(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can unlock Leadership Wiring.';
  end if;

  update public.sessions
  set leadership_wiring_unlocked = true
  where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;
