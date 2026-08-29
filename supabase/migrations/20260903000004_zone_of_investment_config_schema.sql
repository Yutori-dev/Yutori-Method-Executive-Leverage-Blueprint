-- Admin-editable prose for Zone of Investment that doesn't belong on
-- responsibilities/zone_matrix_cells (competency/passion definitions,
-- reflection prompts) -- same "insert new version, admin-write RLS" shape
-- as assessments.

create table public.zone_of_investment_config (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  competency_low_def text not null,
  competency_medium_def text not null,
  competency_high_def text not null,
  passion_low_def text not null,
  passion_medium_def text not null,
  passion_high_def text not null,
  reflection_prompt_1 text not null,
  reflection_prompt_2 text not null,
  reflection_prompt_3 text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.zone_of_investment_config enable row level security;

create policy zone_of_investment_config_select on public.zone_of_investment_config
  for select using (active = true or public.is_admin());

create policy zone_of_investment_config_write_admin on public.zone_of_investment_config
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.zone_of_investment_config (
  version, competency_low_def, competency_medium_def, competency_high_def,
  passion_low_def, passion_medium_def, passion_high_def,
  reflection_prompt_1, reflection_prompt_2, reflection_prompt_3
) values (
  1,
  'You can perform this functionally or with some support, but it''s not a strength.',
  'You are reliably competent at this. You can own it, but it doesn''t distinguish you.',
  'You demonstrate excellence and efficiency. This is an area where you shine and often outperform others.',
  'You dread or avoid it; it drains you.',
  'It''s fine. Neutral. You can take it or leave it.',
  'You enjoy this work and feel energized by it.',
  'Where is your capacity concentrated?',
  'How much of the work consuming meaningful time and energy sits inside your Zone of Investment?',
  'What stands out to you in your Zones of Ambiguity and Vulnerability?'
);
