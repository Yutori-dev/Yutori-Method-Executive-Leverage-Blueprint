import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SelfIdentification } from "@/types/database";

export interface WhiteWhaleConfig {
  header: string;
  setupCopy: string;
  prompt: string;
  placeholderText: string;
  privacyNote: string;
}

export interface LeadershipWiringConfig {
  header: string;
  prompt: string;
  descriptions: Record<SelfIdentification, string>;
}

export interface OperatingAltitudeData {
  selfIdentification: SelfIdentification | null;
  whiteWhale: string;
  whiteWhaleUnlocked: boolean;
  leadershipWiringUnlocked: boolean;
  whiteWhaleConfig: WhiteWhaleConfig;
  leadershipWiringConfig: LeadershipWiringConfig;
}

const FALLBACK_WHITE_WHALE_CONFIG: WhiteWhaleConfig = {
  header: "Your White Whale",
  setupCopy: "",
  prompt: "What is your White Whale?",
  placeholderText: "",
  privacyNote: "",
};

const FALLBACK_LEADERSHIP_WIRING_CONFIG: LeadershipWiringConfig = {
  header: "How are you naturally wired?",
  prompt: "",
  descriptions: { visionary: "", integrator: "", hybrid: "" },
};

export async function getOperatingAltitudeData(
  sessionId: string,
  participantSessionId: string,
): Promise<OperatingAltitudeData> {
  const supabase = await createServerSupabaseClient();

  const [{ data: ps }, { data: reflection }, { data: session }, { data: whiteWhaleRow }, { data: wiringRow }] =
    await Promise.all([
      supabase.from("participant_sessions").select("self_identification").eq("id", participantSessionId).maybeSingle(),
      supabase.from("participant_reflections").select("white_whale").eq("participant_session_id", participantSessionId).maybeSingle(),
      supabase
        .from("sessions")
        .select("white_whale_unlocked, leadership_wiring_unlocked")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase
        .from("white_whale_config")
        .select("header, setup_copy, prompt, placeholder_text, privacy_note")
        .eq("active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("leadership_wiring_config")
        .select("header, prompt, visionary_description, integrator_description, hybrid_description")
        .eq("active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    selfIdentification: (ps?.self_identification as SelfIdentification | null) ?? null,
    whiteWhale: reflection?.white_whale ?? "",
    whiteWhaleUnlocked: session?.white_whale_unlocked ?? false,
    leadershipWiringUnlocked: session?.leadership_wiring_unlocked ?? false,
    whiteWhaleConfig: whiteWhaleRow
      ? {
          header: whiteWhaleRow.header,
          setupCopy: whiteWhaleRow.setup_copy,
          prompt: whiteWhaleRow.prompt,
          placeholderText: whiteWhaleRow.placeholder_text,
          privacyNote: whiteWhaleRow.privacy_note,
        }
      : FALLBACK_WHITE_WHALE_CONFIG,
    leadershipWiringConfig: wiringRow
      ? {
          header: wiringRow.header,
          prompt: wiringRow.prompt,
          descriptions: {
            visionary: wiringRow.visionary_description,
            integrator: wiringRow.integrator_description,
            hybrid: wiringRow.hybrid_description,
          },
        }
      : FALLBACK_LEADERSHIP_WIRING_CONFIG,
  };
}
