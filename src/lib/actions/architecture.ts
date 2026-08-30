"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ArchitectureReaction } from "@/types/database";

export async function calculateArchitectureRecommendation(params: {
  participantSessionId: string;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("calculate_executive_support_architecture", {
    p_participant_session_id: params.participantSessionId,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
  return { ok: true as const };
}

export async function submitArchitectureReaction(params: {
  participantSessionId: string;
  reaction: ArchitectureReaction;
  note: string | null;
  sessionPath: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("submit_architecture_reaction", {
    p_participant_session_id: params.participantSessionId,
    p_reaction: params.reaction,
    // The generated arg type doesn't reflect that this Postgres parameter
    // accepts NULL (the codegen can't see nullability on a plain function
    // parameter) -- it does, and passing null here is intentional.
    p_note: params.note as unknown as string,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(params.sessionPath);
  return { ok: true as const };
}
