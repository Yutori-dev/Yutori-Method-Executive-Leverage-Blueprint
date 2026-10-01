-- Client feedback: the new modules must be selectable per session (on/off at
-- session creation, like the existing modules), and the EA Experience
-- Assessment (and the EA version of the audit) must only reach assistants.
--
-- 1. modules.audience: who a module is for.
-- 2. participants.self_identified_role: asked once at sign-up, because a
--    person's title is not known until intake, which comes AFTER the EA
--    Experience Assessment.
-- 3. my_role_hints(): participants cannot read master_profiles (the admin
--    override lives there), so a security-definer function returns just the
--    signals the app needs to resolve the caller's role.
-- 4. The six new modules become active (so they appear in the session form)
--    but are appended to disabled_module_keys on every EXISTING session, so
--    nothing changes for sessions that already exist.

alter table public.modules
  add column if not exists audience text not null default 'everyone'
  check (audience in ('everyone', 'visionary', 'integrator'));

update public.modules set audience = 'integrator'
  where key in ('ea_experience_assessment', 'ea_leverage_audit_ea');
update public.modules set audience = 'visionary'
  where key in ('thinking_traps', 'ea_leverage_audit_visionary', 'start_stop_shift', 'high_leverage_handoff');

alter table public.participants
  add column if not exists self_identified_role text
  check (self_identified_role in ('visionary', 'integrator'));

create or replace function public.my_role_hints()
returns table (role_override text, self_identified_role text, current_role_title text)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select master_profile_id from public.participants where id = auth.uid()
  )
  select
    (select mp.inferred_role_override from public.master_profiles mp
       where mp.id = (select master_profile_id from me)),
    (select p.self_identified_role from public.participants p
       where p.master_profile_id = (select master_profile_id from me)
         and p.self_identified_role is not null
       order by p.created_at desc limit 1),
    (select p.current_role_title from public.participants p
       where p.master_profile_id = (select master_profile_id from me)
         and p.current_role_title is not null
       order by p.created_at desc limit 1);
$$;

revoke all on function public.my_role_hints() from public;
grant execute on function public.my_role_hints() to authenticated;

-- Existing sessions keep exactly the experience they have today.
update public.sessions s
set disabled_module_keys = (
  select coalesce(array_agg(distinct k), '{}')
  from unnest(coalesce(s.disabled_module_keys, '{}') || array[
    'ea_experience_assessment', 'thinking_traps', 'ea_leverage_audit_visionary',
    'ea_leverage_audit_ea', 'start_stop_shift', 'high_leverage_handoff'
  ]) as k
);

update public.modules set active = true
  where key in (
    'ea_experience_assessment', 'thinking_traps', 'ea_leverage_audit_visionary',
    'ea_leverage_audit_ea', 'start_stop_shift', 'high_leverage_handoff'
  );
