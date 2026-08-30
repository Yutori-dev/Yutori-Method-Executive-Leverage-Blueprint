-- Participant Intake spec section 11: admin can edit a participant's
-- intake data, and editing current executive support after an
-- architecture recommendation has already been calculated flags that
-- recommendation for recalculation rather than silently going stale.

alter table public.architecture_recommendations
  add column needs_recalculation boolean not null default false;

-- save_participant_intake: same recalculation-flagging behavior added
-- here as in the new admin edit function below, so a participant editing
-- their own intake after architecture generation flags it too, not just
-- an admin doing it on their behalf.
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

  update public.architecture_recommendations ar
  set needs_recalculation = true
  from public.participant_sessions ps
  where ps.id = ar.participant_session_id
    and ps.participant_id = auth.uid();

  return v_row;
end;
$$;

-- admin_update_participant_intake: mirrors save_participant_intake's
-- validation exactly, but admin-gated and targeting an arbitrary
-- participant_id instead of auth.uid(). Flags any of that participant's
-- existing architecture_recommendations rows for recalculation, since
-- current-support data feeds the architecture recommendation once Part 5's
-- role-mapping logic is built (not yet -- see docs/CLIENT_FEEDBACK_ROUND4.md)
-- and an admin editing it after the fact shouldn't silently leave a stale
-- recommendation on record.
create or replace function public.admin_update_participant_intake(
  p_participant_id uuid,
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
  if not public.is_admin() then
    raise exception 'Only an admin can edit participant intake data.';
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
