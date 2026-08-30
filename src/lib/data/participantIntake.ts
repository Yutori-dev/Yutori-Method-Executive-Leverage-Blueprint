import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ParticipantIntakeData {
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
  currentSupportOther: boolean;
  currentSupportOtherText: string;
  currentSupportNone: boolean;
}

/** The caller's own intake answers, for prefilling the form on re-entry
 * (intake is editable after completion). Empty defaults for a
 * not-yet-started intake -- there's nothing to distinguish "row exists
 * with defaults" from "hasn't started" here, that's hasCompletedIntake's
 * job (moduleZeroStatus.ts). */
export async function getParticipantIntake(): Promise<ParticipantIntakeData | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("participants")
    .select(
      "company_name, current_role_title, current_support_personal_assistant, current_support_admin_or_va, current_support_executive_assistant, current_support_senior_executive_assistant, current_support_head_of_operations, current_support_chief_of_staff, current_support_chief_integrator, current_support_coo, current_support_other, current_support_other_text, current_support_none",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    companyName: data.company_name ?? "",
    currentRoleTitle: data.current_role_title ?? "",
    currentSupportPersonalAssistant: data.current_support_personal_assistant,
    currentSupportAdminOrVa: data.current_support_admin_or_va,
    currentSupportExecutiveAssistant: data.current_support_executive_assistant,
    currentSupportSeniorExecutiveAssistant: data.current_support_senior_executive_assistant,
    currentSupportHeadOfOperations: data.current_support_head_of_operations,
    currentSupportChiefOfStaff: data.current_support_chief_of_staff,
    currentSupportChiefIntegrator: data.current_support_chief_integrator,
    currentSupportCoo: data.current_support_coo,
    currentSupportOther: data.current_support_other,
    currentSupportOtherText: data.current_support_other_text ?? "",
    currentSupportNone: data.current_support_none,
  };
}
