-- Admin-editable copy for the reworked Executive Support Architecture
-- engine. The branching LOGIC (majority rules, absorption table,
-- current-support classification) is hardcoded in
-- calculate_executive_support_architecture per the client's fully-specified
-- spec -- only participant-facing copy lives here, same split as every
-- other activity's config table. {level} is a placeholder token the UI
-- substitutes with the resolved layer name at render time.

create table public.executive_support_architecture_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  active boolean not null default true,

  results_header text not null,
  audit_only_intro text not null,
  multi_layer_intro text not null,
  leading_need_header text not null,
  leading_need_body text not null,
  secondary_need_header text not null,
  systems_amplifier_prepend text not null,
  corroboration_strong_header text not null,
  corroboration_strong_body text not null,

  what_this_means_execution text not null,
  what_this_means_orchestration text not null,
  what_this_means_strategic text not null,
  what_this_means_systems text not null,

  strengthen_execution_copy text not null,
  add_execution_copy text not null,
  strengthen_orchestration_copy text not null,
  evolve_or_add_orchestration_copy text not null,
  add_orchestration_copy text not null,
  strengthen_strategic_copy text not null,
  add_strategic_from_orchestration_copy text not null,
  add_strategic_copy text not null,
  strengthen_systems_copy text not null,
  add_systems_copy text not null,

  created_at timestamptz not null default now()
);

alter table public.executive_support_architecture_config enable row level security;

create policy "authenticated can read executive support architecture config"
  on public.executive_support_architecture_config for select
  using (auth.uid() is not null);

create policy "admins write executive support architecture config"
  on public.executive_support_architecture_config for all
  using (public.is_admin())
  with check (public.is_admin());

-- Real content, exact wording from the client's V1 spec sections 5, 10-14.
insert into public.executive_support_architecture_config (
  version, active, results_header, audit_only_intro, multi_layer_intro, leading_need_header, leading_need_body,
  secondary_need_header, systems_amplifier_prepend, corroboration_strong_header, corroboration_strong_body,
  what_this_means_execution, what_this_means_orchestration, what_this_means_strategic, what_this_means_systems,
  strengthen_execution_copy, add_execution_copy,
  strengthen_orchestration_copy, evolve_or_add_orchestration_copy, add_orchestration_copy,
  strengthen_strategic_copy, add_strategic_from_orchestration_copy, add_strategic_copy,
  strengthen_systems_copy, add_systems_copy
) values (
  1, true,
  'YOUR RECOMMENDED EXECUTIVE SUPPORT ARCHITECTURE',
  'You did not identify Priority Leverage Opportunities outside your Zone of Investment. Your broader Executive Support Audit therefore provides the starting point for considering where additional leverage may be useful.',
  'Your Priority Leverage Opportunities span multiple levels of executive support rather than clustering around a single layer.',
  'Leading Leverage Need',
  'Your Priority Leverage Opportunities span multiple levels. Your broader Executive Support Audit also surfaced {level} Leverage as a prominent gap, making it an important place to begin evaluating your support architecture.',
  'SECONDARY LEVERAGE NEED',
  'Systems Leverage may amplify the capacity of your recommended human-support architecture.',
  'Your broader Executive Support Audit reinforces this recommendation.',
  'Both the ownership you most want to transfer and the broader friction in your current operating environment point toward greater {level} Leverage.',
  'The ownership you most want to transfer clusters around defined tasks and outputs that can be reliably executed elsewhere.',
  'The ownership you most want to transfer clusters around coordinating information, priorities, commitments and activity around you.',
  'The ownership you most want to transfer clusters around work requiring meaningful judgment, decision-making or leadership authority beyond you.',
  'The ownership you most want to transfer clusters around work that AI, automation and redesigned workflows could increasingly absorb or accelerate.',
  'You already have support positioned at the Execution layer. Before adding another role, evaluate whether greater leverage could be created through increased scope, capability, capacity or utilization of the support already in place.',
  'Your Priority Leverage Opportunities suggest a need for dedicated Execution Leverage that does not appear to exist in your current support structure.',
  'You already have support positioned at the Orchestration layer. Before adding another role, evaluate whether greater leverage could be created by expanding its scope, ownership, capability or authority.',
  'Your current support is concentrated at the Execution layer while the ownership you most want to transfer requires Orchestration Leverage. Evaluate whether your existing support can grow into greater ownership or whether dedicated Orchestration support should be added.',
  'Your Priority Leverage Opportunities suggest a need for dedicated Orchestration Leverage that does not appear to exist in your current support structure.',
  'You already have support positioned at the Strategic layer. Before adding another role, evaluate whether greater leverage could be created through expanded scope, authority, capability or capacity within the strategic support already in place.',
  'Your current architecture includes Orchestration support, while the ownership identified here requires Strategic Leverage. Evaluate the addition of an appropriately empowered strategic support layer rather than extending the existing role beyond the level of ownership it is designed to carry.',
  'Your Priority Leverage Opportunities suggest a need for Strategic Leverage that does not appear to exist in your current support structure.',
  'You already have systems creating leverage in your current environment. Evaluate where AI, automation and redesigned workflows could absorb additional recurring work or reduce human dependency further.',
  'Your leverage opportunities suggest meaningful capacity could be created through AI agents, automated workflows and stronger systems that reduce reliance on manual human effort.'
);
