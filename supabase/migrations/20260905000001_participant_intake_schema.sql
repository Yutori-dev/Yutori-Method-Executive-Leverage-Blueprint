-- Participant Registration / Intake (client spec round 4). Runs before the
-- Executive Leverage Diagnostic, once per participant, editable afterward.
-- Full name and email are already collected at signup (JoinForm ->
-- ensure_participant), so this only adds the fields signup doesn't
-- capture: company, role/title, and current executive support (structured
-- per-role booleans, so Part 5's recommendation engine can query
-- individual roles rather than parsing free text).

alter table public.participants
  add column company_name text,
  add column current_role_title text,
  add column current_support_personal_assistant boolean not null default false,
  add column current_support_admin_or_va boolean not null default false,
  add column current_support_executive_assistant boolean not null default false,
  add column current_support_senior_executive_assistant boolean not null default false,
  add column current_support_head_of_operations boolean not null default false,
  add column current_support_chief_of_staff boolean not null default false,
  add column current_support_chief_integrator boolean not null default false,
  add column current_support_coo boolean not null default false,
  add column current_support_other boolean not null default false,
  add column current_support_other_text text,
  add column current_support_none boolean not null default false,
  add column intake_started_at timestamptz,
  add column intake_completed_at timestamptz;

-- mark_intake_started: best-effort analytics timestamp, set once on first
-- render of the intake form. Idempotent (coalesce), own-row-only.
create or replace function public.mark_intake_started()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No authenticated user.';
  end if;

  update public.participants
  set intake_started_at = coalesce(intake_started_at, now())
  where id = auth.uid();
end;
$$;

-- save_participant_intake: upserts the caller's own intake fields.
-- Enforces "None of the above" mutual exclusivity server-side (not just in
-- the UI, matching this app's standard elsewhere) and requires the other-
-- support text when p_current_support_other is true. intake_completed_at
-- is set once and preserved on later edits (spec: "editable after
-- completion" shouldn't reset when the participant first completed it).
create or replace function public.save_participant_intake(
  p_company_name text,
  p_current_role_title text,
  p_current_support_personal_assistant boolean,
  p_current_support_admin_or_va boolean,
  p_current_support_executive_assistant boolean,
  p_current_support_senior_executive_assistant boolean,
  p_current_support_head_of_operations boolean,
  p_current_support_chief_of_staff boolean,
  p_current_support_chief_integrator boolean,
  p_current_support_coo boolean,
  p_current_support_other boolean,
  p_current_support_other_text text,
  p_current_support_none boolean
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.participants;
  v_any_role boolean;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user.';
  end if;

  if trim(coalesce(p_company_name, '')) = '' then
    raise exception 'Company name is required.';
  end if;

  if trim(coalesce(p_current_role_title, '')) = '' then
    raise exception 'Current role/title is required.';
  end if;

  v_any_role := p_current_support_personal_assistant or p_current_support_admin_or_va
    or p_current_support_executive_assistant or p_current_support_senior_executive_assistant
    or p_current_support_head_of_operations or p_current_support_chief_of_staff
    or p_current_support_chief_integrator or p_current_support_coo or p_current_support_other;

  if p_current_support_none and v_any_role then
    raise exception '"None of the above" cannot be combined with other selections.';
  end if;

  if not p_current_support_none and not v_any_role then
    raise exception 'Select at least one current executive support option.';
  end if;

  if p_current_support_other and trim(coalesce(p_current_support_other_text, '')) = '' then
    raise exception 'Describe the other executive support.';
  end if;

  update public.participants
  set company_name = trim(p_company_name),
      current_role_title = trim(p_current_role_title),
      current_support_personal_assistant = p_current_support_personal_assistant,
      current_support_admin_or_va = p_current_support_admin_or_va,
      current_support_executive_assistant = p_current_support_executive_assistant,
      current_support_senior_executive_assistant = p_current_support_senior_executive_assistant,
      current_support_head_of_operations = p_current_support_head_of_operations,
      current_support_chief_of_staff = p_current_support_chief_of_staff,
      current_support_chief_integrator = p_current_support_chief_integrator,
      current_support_coo = p_current_support_coo,
      current_support_other = p_current_support_other,
      current_support_other_text = case when p_current_support_other then trim(p_current_support_other_text) else null end,
      current_support_none = p_current_support_none,
      intake_completed_at = coalesce(intake_completed_at, now())
  where id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Participant profile must exist before completing intake.';
  end if;

  return v_row;
end;
$$;
