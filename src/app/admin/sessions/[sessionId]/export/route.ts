import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { formatCurrentSupport } from "@/lib/currentSupportLabels";
import type { LeverageLevel } from "@/types/database";

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

/**
 * One row per registered participant. RLS (is_admin()) is the real
 * authorization boundary on every query below; this route additionally
 * checks it explicitly up front so an unauthorized caller gets a clean 403
 * instead of a CSV with every column blank.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { data: session } = await supabase.from("sessions").select("name").eq("id", sessionId).maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: enrollments } = await supabase
    .from("participant_sessions")
    .select("id, participant_id, completion_state, started_at, completed_at, last_active_at")
    .eq("session_id", sessionId)
    .order("last_active_at", { ascending: false });

  const rows: (string | number | boolean | null)[][] = [];

  for (const enrollment of enrollments ?? []) {
    const [{ data: participant }, { data: responsibilities }, { data: priorities }, { data: recommendation }] =
      await Promise.all([
        supabase
          .from("participants")
          .select(
            "first_name, last_name, email, company_name, current_role_title, current_support_personal_assistant, current_support_admin_or_va, current_support_executive_assistant, current_support_senior_executive_assistant, current_support_head_of_operations, current_support_chief_of_staff, current_support_chief_integrator, current_support_coo, current_support_ai_automation, current_support_other, current_support_other_text, current_support_none",
          )
          .eq("id", enrollment.participant_id)
          .maybeSingle(),
        supabase
          .from("participant_responsibilities")
          .select("macro_zone")
          .eq("participant_session_id", enrollment.id),
        supabase
          .from("priority_delegation_opportunities")
          .select("selection_order, leverage_level_snapshot, responsibilities(label)")
          .eq("participant_session_id", enrollment.id)
          .order("selection_order", { ascending: true }),
        supabase
          .from("architecture_recommendations")
          .select(
            "primary_signal_type, primary_leverage_need, leading_leverage_need, secondary_leverage_needs, reaction, reaction_note",
          )
          .eq("participant_session_id", enrollment.id)
          .maybeSingle(),
      ]);

    const zoneCounts = { investment: 0, ambiguity: 0, vulnerability: 0 } as Record<string, number>;
    for (const r of responsibilities ?? []) {
      if (r.macro_zone) zoneCounts[r.macro_zone] = (zoneCounts[r.macro_zone] ?? 0) + 1;
    }

    const priorityByOrder = new Map(
      (priorities ?? []).map((p) => [
        p.selection_order,
        {
          label: (p.responsibilities as unknown as { label: string } | null)?.label ?? "",
          level: p.leverage_level_snapshot as LeverageLevel | null,
        },
      ]),
    );

    rows.push([
      participant?.first_name ?? "",
      participant?.last_name ?? "",
      participant?.email ?? "",
      participant?.company_name ?? "",
      participant?.current_role_title ?? "",
      participant ? formatCurrentSupport({
        currentSupportPersonalAssistant: participant.current_support_personal_assistant,
        currentSupportAdminOrVa: participant.current_support_admin_or_va,
        currentSupportExecutiveAssistant: participant.current_support_executive_assistant,
        currentSupportSeniorExecutiveAssistant: participant.current_support_senior_executive_assistant,
        currentSupportHeadOfOperations: participant.current_support_head_of_operations,
        currentSupportChiefOfStaff: participant.current_support_chief_of_staff,
        currentSupportChiefIntegrator: participant.current_support_chief_integrator,
        currentSupportCoo: participant.current_support_coo,
        currentSupportAiAutomation: participant.current_support_ai_automation,
        currentSupportOther: participant.current_support_other,
        currentSupportOtherText: participant.current_support_other_text,
        currentSupportNone: participant.current_support_none,
      }) : "",
      enrollment.completion_state,
      enrollment.started_at,
      enrollment.completed_at,
      enrollment.last_active_at,
      responsibilities?.length ?? 0,
      zoneCounts.investment,
      zoneCounts.ambiguity,
      zoneCounts.vulnerability,
      priorityByOrder.get(1)?.label ?? "",
      priorityByOrder.get(1) ? (LEVEL_LABEL[priorityByOrder.get(1)!.level ?? ""] ?? "") : "",
      priorityByOrder.get(2)?.label ?? "",
      priorityByOrder.get(2) ? (LEVEL_LABEL[priorityByOrder.get(2)!.level ?? ""] ?? "") : "",
      priorityByOrder.get(3)?.label ?? "",
      priorityByOrder.get(3) ? (LEVEL_LABEL[priorityByOrder.get(3)!.level ?? ""] ?? "") : "",
      recommendation?.primary_signal_type ?? "",
      recommendation
        ? (LEVEL_LABEL[recommendation.primary_leverage_need ?? recommendation.leading_leverage_need ?? ""] ?? "")
        : "",
      recommendation ? (recommendation.secondary_leverage_needs ?? []).map((l: string) => LEVEL_LABEL[l] ?? l).join(" · ") : "",
      recommendation?.reaction ?? "",
      recommendation?.reaction_note ?? "",
    ]);
  }

  const csv = toCsv(
    [
      "First name",
      "Last name",
      "Email",
      "Company",
      "Role / title",
      "Current executive support",
      "Completion state",
      "Started at",
      "Completed at",
      "Last active at",
      "Responsibilities rated",
      "Zone of Investment count",
      "Zone of Ambiguity count",
      "Zone of Vulnerability count",
      "Priority 1",
      "Priority 1 leverage",
      "Priority 2",
      "Priority 2 leverage",
      "Priority 3",
      "Priority 3 leverage",
      "Architecture signal type",
      "Architecture primary/leading level",
      "Architecture secondary needs",
      "Architecture reaction",
      "Architecture reaction note",
    ],
    rows,
  );

  const filename = `${session.name.replace(/[^a-z0-9]+/gi, "-")}-export.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
