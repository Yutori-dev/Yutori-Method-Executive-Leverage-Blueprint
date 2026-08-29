"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function calculateExecutiveLeverageDiagnostic(params: {
  participantSessionId: string;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("calculate_executive_leverage_diagnostic", {
    p_participant_session_id: params.participantSessionId,
  });

  if (error || !data) return { ok: false as const, message: error?.message ?? "No result returned." };

  revalidatePath(params.sessionPath);

  // Deliberately narrow: no total_points/internal_percentage cross this
  // boundary. "Do not display numeric score" is enforced by what this
  // return type is capable of carrying, not just by what a component
  // chooses to render.
  return {
    ok: true as const,
    profileLabel: data.overall_result,
    profileDescription: data.interpretation,
    strongestConstraints:
      (data.strongest_constraints as { label: string; interpretation: string }[] | null) ?? [],
  };
}
