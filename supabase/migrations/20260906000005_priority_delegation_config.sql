-- Priority Delegation Opportunities admin-editable copy (spec section 12).
-- Same versioned-singleton pattern as white_whale_config /
-- leadership_wiring_config -- insert a higher version, queries always pick
-- the latest active by version desc, no need to deactivate old rows.

create table public.priority_delegation_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  active boolean not null default true,
  intro_copy text not null,
  fewer_than_three_copy text not null,
  zero_eligible_copy text not null,
  zone_ambiguity_description text not null,
  zone_vulnerability_description text not null,
  pressure_test_question text not null,
  somewhat_no_followup_copy text not null,
  confirmation_copy text not null,
  created_at timestamptz not null default now()
);

alter table public.priority_delegation_config enable row level security;

create policy "authenticated can read priority delegation config"
  on public.priority_delegation_config for select
  using (auth.uid() is not null);

insert into public.priority_delegation_config (
  version, active, intro_copy, fewer_than_three_copy, zero_eligible_copy,
  zone_ambiguity_description, zone_vulnerability_description,
  pressure_test_question, somewhat_no_followup_copy, confirmation_copy
) values (
  1, true,
  'You identified the responsibilities below as sitting outside your Zone of Investment. Now consider them through the lens of what you just learned about delegation. If the right person, capability and delegation conditions existed, would it still make sense for me to own this? Select the three responsibilities where transferring ownership would create the greatest value for you.',
  'You''ve identified fewer than three responsibilities outside your Zone of Investment. Select the responsibilities you would most value transferring from those shown below.',
  'You did not identify any responsibilities outside your Zone of Investment. No Priority Delegation Opportunities are assigned.',
  'Your capability or interest makes your continued ownership worth examining.',
  'Work where your current investment is less likely to represent your highest and best use.',
  'If you no longer owned these responsibilities, would you experience a meaningful increase in available capacity?',
  'Consider whether there are other responsibilities on your list where transferring ownership would create greater capacity or leverage.',
  'These are the responsibilities we''ll use next to explore the kind of executive leverage that could create greater capacity around you.'
);
