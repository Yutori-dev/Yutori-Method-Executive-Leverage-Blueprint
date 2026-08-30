-- Priority Leverage Opportunities Reveal (client V1 spec, 2026-08-30). A
-- second phase of the existing "leverage" module (its own seed description
-- already says "Executive Support Audit and leverage mapping reveal") --
-- combines a participant's confirmed Priority Delegation Opportunities
-- (with their hidden leverage_level_snapshot) and their already-calculated
-- Executive Support Audit results for reference. No new scoring: this is a
-- read-time combination of two already-computed data sets, facilitator-gated
-- like Zone of Investment / Architecture reveal.
--
-- Reveal-gating note (same trade-off already documented for Zone of
-- Investment): priority_delegation_opportunities.leverage_level_snapshot is
-- already readable by the owning participant today (no RLS lockdown on that
-- column), so "hidden until reveal" is enforced at the loader/UI level only,
-- not by RLS -- locking it down at the RLS level would conflict with the
-- Delegation module's own unconditional read of the same column.

alter table public.sessions
  add column priority_leverage_reveal_unlocked boolean not null default false;

create function public.admin_reveal_priority_leverage(p_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reveal Priority Leverage Opportunities.';
  end if;

  update public.sessions
  set priority_leverage_reveal_unlocked = true
  where id = p_session_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Session not found.';
  end if;

  return v_row;
end;
$$;

create table public.priority_leverage_reveal_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  active boolean not null default true,
  reveal_header text not null,
  reveal_intro text not null,
  leverage_pattern_header text not null,
  audit_context_header text not null,
  no_secondary_gap_label text not null,
  interpretation_headline text not null,
  interpretation_body text not null,
  created_at timestamptz not null default now()
);

alter table public.priority_leverage_reveal_config enable row level security;

create policy "authenticated can read priority leverage reveal config"
  on public.priority_leverage_reveal_config for select
  using (auth.uid() is not null);

create policy "admins write priority leverage reveal config"
  on public.priority_leverage_reveal_config for all
  using (public.is_admin())
  with check (public.is_admin());

-- Real content, exact wording from the client's V1 spec sections 2-5.
insert into public.priority_leverage_reveal_config (
  version, active, reveal_header, reveal_intro, leverage_pattern_header, audit_context_header,
  no_secondary_gap_label, interpretation_headline, interpretation_body
) values (
  1, true,
  'YOUR PRIORITY LEVERAGE OPPORTUNITIES',
  'Each responsibility you selected was mapped in advance to the level of executive leverage best equipped to absorb that ownership.',
  'YOUR LEVERAGE PATTERN',
  'YOUR EXECUTIVE SUPPORT AUDIT',
  'No Clear Secondary Gap Surfaced',
  'The Audit gives us context. Your Priority Leverage Opportunities give us direction.',
  'Your Audit reflects where friction most frequently appears across your broader executive-support environment. Your Priority Leverage Opportunities show where you specifically want ownership to move and the level of leverage best equipped to carry it.'
);
