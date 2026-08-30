"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface IntakeInput {
  firstName: string;
  lastName: string;
  companyName: string;
  currentRoleTitle: string;
  currentSupportPersonalAssistant: boolean;
  currentSupportAdminOrVa: boolean;
  currentSupportExecutiveAssistant: boolean;
  currentSupportSeniorExecutiveAssistant: boolean;
  currentSupportHeadOfOperations: boolean;
  currentSupportChiefOfStaff: boolean;
  currentSupportChiefIntegrator: boolean;
  currentSupportCoo: boolean;
  currentSupportAiAutomation: boolean;
  currentSupportOther: boolean;
  currentSupportOtherText: string;
  currentSupportNone: boolean;
  sessionPath: string;
}

export async function saveParticipantIntake(input: IntakeInput) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("save_participant_intake", {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_company_name: input.companyName,
    p_current_role_title: input.currentRoleTitle,
    p_current_support_personal_assistant: input.currentSupportPersonalAssistant,
    p_current_support_admin_or_va: input.currentSupportAdminOrVa,
    p_current_support_executive_assistant: input.currentSupportExecutiveAssistant,
    p_current_support_senior_executive_assistant: input.currentSupportSeniorExecutiveAssistant,
    p_current_support_head_of_operations: input.currentSupportHeadOfOperations,
    p_current_support_chief_of_staff: input.currentSupportChiefOfStaff,
    p_current_support_chief_integrator: input.currentSupportChiefIntegrator,
    p_current_support_coo: input.currentSupportCoo,
    p_current_support_ai_automation: input.currentSupportAiAutomation,
    p_current_support_other: input.currentSupportOther,
    p_current_support_other_text: input.currentSupportOtherText,
    p_current_support_none: input.currentSupportNone,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath(input.sessionPath);
  return { ok: true as const };
}

export async function markIntakeStarted() {
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("mark_intake_started");
}

export interface AdminIntakeInput extends IntakeInput {
  participantId: string;
  adminPath: string;
}

export async function adminUpdateParticipantIntake(input: AdminIntakeInput) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("admin_update_participant_intake", {
    p_participant_id: input.participantId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_company_name: input.companyName,
    p_current_role_title: input.currentRoleTitle,
    p_current_support_personal_assistant: input.currentSupportPersonalAssistant,
    p_current_support_admin_or_va: input.currentSupportAdminOrVa,
    p_current_support_executive_assistant: input.currentSupportExecutiveAssistant,
    p_current_support_senior_executive_assistant: input.currentSupportSeniorExecutiveAssistant,
    p_current_support_head_of_operations: input.currentSupportHeadOfOperations,
    p_current_support_chief_of_staff: input.currentSupportChiefOfStaff,
    p_current_support_chief_integrator: input.currentSupportChiefIntegrator,
    p_current_support_coo: input.currentSupportCoo,
    p_current_support_ai_automation: input.currentSupportAiAutomation,
    p_current_support_other: input.currentSupportOther,
    p_current_support_other_text: input.currentSupportOtherText,
    p_current_support_none: input.currentSupportNone,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath(input.adminPath);
  return { ok: true as const };
}
