import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface WhiteWhaleConfigData {
  header: string;
  setupCopy: string;
  prompt: string;
  placeholderText: string;
  privacyNote: string;
}

export interface LeadershipWiringConfigData {
  header: string;
  prompt: string;
  visionaryDescription: string;
  integratorDescription: string;
  hybridDescription: string;
  dashboardNote: string;
}

export interface OperatingAltitudeConfigData {
  whiteWhale: WhiteWhaleConfigData;
  leadershipWiring: LeadershipWiringConfigData;
}

export async function getOperatingAltitudeConfigData(): Promise<OperatingAltitudeConfigData> {
  const supabase = await createServerSupabaseClient();

  const [{ data: whiteWhale }, { data: wiring }] = await Promise.all([
    supabase
      .from("white_whale_config")
      .select("header, setup_copy, prompt, placeholder_text, privacy_note")
      .eq("active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("leadership_wiring_config")
      .select("header, prompt, visionary_description, integrator_description, hybrid_description, dashboard_note")
      .eq("active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    whiteWhale: {
      header: whiteWhale?.header ?? "",
      setupCopy: whiteWhale?.setup_copy ?? "",
      prompt: whiteWhale?.prompt ?? "",
      placeholderText: whiteWhale?.placeholder_text ?? "",
      privacyNote: whiteWhale?.privacy_note ?? "",
    },
    leadershipWiring: {
      header: wiring?.header ?? "",
      prompt: wiring?.prompt ?? "",
      visionaryDescription: wiring?.visionary_description ?? "",
      integratorDescription: wiring?.integrator_description ?? "",
      hybridDescription: wiring?.hybrid_description ?? "",
      dashboardNote: wiring?.dashboard_note ?? "",
    },
  };
}
