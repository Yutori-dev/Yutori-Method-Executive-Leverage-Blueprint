import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SelfIdentification } from "@/types/database";

export interface OperatingAltitudeData {
  selfIdentification: SelfIdentification | null;
  whiteWhale: string;
}

export async function getOperatingAltitudeData(
  participantSessionId: string,
): Promise<OperatingAltitudeData> {
  const supabase = await createServerSupabaseClient();

  const [{ data: ps }, { data: reflection }] = await Promise.all([
    supabase.from("participant_sessions").select("self_identification").eq("id", participantSessionId).maybeSingle(),
    supabase.from("participant_reflections").select("white_whale").eq("participant_session_id", participantSessionId).maybeSingle(),
  ]);

  return {
    selfIdentification: (ps?.self_identification as SelfIdentification | null) ?? null,
    whiteWhale: reflection?.white_whale ?? "",
  };
}
