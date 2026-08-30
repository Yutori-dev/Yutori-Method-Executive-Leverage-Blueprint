-- The Executive Support Architecture spec (client V1, 2026-08-30) lists
-- "AI / automation systems that meaningfully absorb recurring work" as one
-- of the 11 structured Current Executive Support options (section 2) and
-- maps it to Systems leverage capability (section 9) -- but intake never
-- had a column for it (20260905000001_participant_intake_schema.sql's 8
-- role checkboxes plus other/none omitted it entirely). Adding it now,
-- ahead of the Architecture engine that needs it.

alter table public.participants
  add column current_support_ai_automation boolean not null default false;

-- Adding a parameter changes the signature -- drop the old overloads first
-- (same trap as 20260907000001_intake_name_fields.sql).
drop function if exists public.save_participant_intake(
  text, text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, text, boolean
);
drop function if exists public.admin_update_participant_intake(
  uuid, text, text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, text, boolean
);

create or replace function public.save_participant_intake(
  p_first_name text,
  p_last_name text,
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
  p_current_support_ai_automation boolean,
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

  if trim(coalesce(p_first_name, '')) = '' then
    raise exception 'First name is required.';
  end if;

  if trim(coalesce(p_last_name, '')) = '' then
    raise exception 'Last name is required.';
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
    or p_current_support_chief_integrator or p_current_support_coo or p_current_support_ai_automation
    or p_current_support_other;

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
  set first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      company_name = trim(p_company_name),
      current_role_title = trim(p_current_role_title),
      current_support_personal_assistant = p_current_support_personal_assistant,
      current_support_admin_or_va = p_current_support_admin_or_va,
      current_support_executive_assistant = p_current_support_executive_assistant,
      current_support_senior_executive_assistant = p_current_support_senior_executive_assistant,
      current_support_head_of_operations = p_current_support_head_of_operations,
      current_support_chief_of_staff = p_current_support_chief_of_staff,
      current_support_chief_integrator = p_current_support_chief_integrator,
      current_support_coo = p_current_support_coo,
      current_support_ai_automation = p_current_support_ai_automation,
      current_support_other = p_current_support_other,
      current_support_other_text = case when p_current_support_other then trim(p_current_support_other_text) else null end,
      current_support_none = p_current_support_none,
      intake_completed_at = coalesce(intake_completed_at, now())
  where id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Participant profile must exist before completing intake.';
  end if;

  update public.architecture_recommendations ar
  set needs_recalculation = true
  from public.participant_sessions ps
  where ps.id = ar.participant_session_id
    and ps.participant_id = auth.uid();

  return v_row;
end;
$$;

create or replace function public.admin_update_participant_intake(
  p_participant_id uuid,
  p_first_name text,
  p_last_name text,
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
  p_current_support_ai_automation boolean,
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
  if not public.is_admin() then
    raise exception 'Only an admin can edit participant intake data.';
  end if;

  if trim(coalesce(p_first_name, '')) = '' then
    raise exception 'First name is required.';
  end if;

  if trim(coalesce(p_last_name, '')) = '' then
    raise exception 'Last name is required.';
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
    or p_current_support_chief_integrator or p_current_support_coo or p_current_support_ai_automation
    or p_current_support_other;

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
  set first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      company_name = trim(p_company_name),
      current_role_title = trim(p_current_role_title),
      current_support_personal_assistant = p_current_support_personal_assistant,
      current_support_admin_or_va = p_current_support_admin_or_va,
      current_support_executive_assistant = p_current_support_executive_assistant,
      current_support_senior_executive_assistant = p_current_support_senior_executive_assistant,
      current_support_head_of_operations = p_current_support_head_of_operations,
      current_support_chief_of_staff = p_current_support_chief_of_staff,
      current_support_chief_integrator = p_current_support_chief_integrator,
      current_support_coo = p_current_support_coo,
      current_support_ai_automation = p_current_support_ai_automation,
      current_support_other = p_current_support_other,
      current_support_other_text = case when p_current_support_other then trim(p_current_support_other_text) else null end,
      current_support_none = p_current_support_none,
      intake_completed_at = coalesce(intake_completed_at, now())
  where id = p_participant_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Participant not found.';
  end if;

  update public.architecture_recommendations ar
  set needs_recalculation = true
  from public.participant_sessions ps
  where ps.id = ar.participant_session_id
    and ps.participant_id = p_participant_id;

  return v_row;
end;
$$;
