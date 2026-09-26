import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrentSupport } from "@/lib/currentSupportLabels";

/**
 * Complete-response export (client brief 2026-09, item 2): every answer and
 * every other piece of data collected, in long format -- one row per
 * (participant, session, module, question) -- so it survives any change to
 * the question set and opens cleanly in Excel. The existing summarized
 * CSV (sessions/[id]/export) stays as-is for the at-a-glance one-row-per-
 * person view; this is the "nothing discarded" companion.
 *
 * Shared by the per-session and per-master-profile routes: both hand in a
 * list of participant_session ids and get the same rows, so the two exports
 * can't drift apart.
 */

export interface FullExportRow {
  participant: string;
  email: string;
  session: string;
  module: string;
  question: string;
  answer: string;
}

export const FULL_EXPORT_HEADERS = ["Participant", "Email", "Session", "Module", "Question / item", "Answer"];

/** Every participant-authored free-text answer lands in this file, and a
 * cell beginning with = + - or @ is executed as a formula when an admin
 * opens the CSV in Excel. Neutralize with a leading apostrophe. */
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

// Kept in step with the scales rendered in DelegationBeliefsFlow.tsx -- that
// file is a client component so its constants can't be imported here.
const BELIEF_SCALE: Record<number, string> = { 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" };
const OWNERSHIP_SCALE: Record<number, string> = {
  1: "Rarely / Not True", 2: "Sometimes", 3: "Often", 4: "Usually", 5: "Consistently / Very True",
};

// PostgREST caps a response at 1000 rows by default; the widest per-person
// table (Zone of Investment ratings, up to 21) x 25 stays well under it.
const CHUNK_SIZE = 25;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function getFullResponseRows(participantSessionIds: string[]): Promise<FullExportRow[]> {
  const supabase = await createServerSupabaseClient();
  if (participantSessionIds.length === 0) return [];

  // Runs one query per chunk of ids and concatenates -- keeps every request
  // under both the URL-length and 1000-row limits regardless of cohort size.
  async function fetchByIds<T>(run: (ids: string[]) => PromiseLike<{ data: T[] | null }>, ids: string[]): Promise<T[]> {
    const all: T[] = [];
    for (const ids25 of chunk(ids, CHUNK_SIZE)) {
      const { data } = await run(ids25);
      if (data) all.push(...data);
    }
    return all;
  }

  const enrollments = await fetchByIds(
    (ids) =>
      supabase
        .from("participant_sessions")
        .select("id, participant_id, session_id, completion_state, started_at, completed_at, self_identification")
        .in("id", ids),
    participantSessionIds,
  );
  if (enrollments.length === 0) return [];

  const participantIds = [...new Set(enrollments.map((e) => e.participant_id))];
  const sessionIds = [...new Set(enrollments.map((e) => e.session_id))];
  const psIds = enrollments.map((e) => e.id);

  const [participants, sessions] = await Promise.all([
    fetchByIds(
      (ids) =>
        supabase
          .from("participants")
          .select(
            "id, first_name, last_name, email, company_name, current_role_title, current_support_personal_assistant, current_support_admin_or_va, current_support_executive_assistant, current_support_senior_executive_assistant, current_support_head_of_operations, current_support_chief_of_staff, current_support_chief_integrator, current_support_coo, current_support_ai_automation, current_support_other, current_support_other_text, current_support_none, whole_business_os, whole_business_os_other_text, intake_completed_at",
          )
          .in("id", ids),
      participantIds,
    ),
    fetchByIds((ids) => supabase.from("sessions").select("id, name").in("id", ids), sessionIds),
  ]);

  const [
    responses, zoneRows, beliefResponses, beliefResults, priorities, pressureTests,
    auditResponses, auditResults, diagnosticResults, architecture, reflections, feedback, followUps,
  ] = await Promise.all([
    fetchByIds((ids) => supabase.from("responses").select("participant_session_id, question_id, answer").in("participant_session_id", ids), psIds),
    fetchByIds(
      (ids) =>
        supabase
          .from("participant_responsibilities")
          .select("participant_session_id, competency, passion, matrix_cell, macro_zone, responsibilities(label, leverage_level, sort_order)")
          .in("participant_session_id", ids),
      psIds,
    ),
    fetchByIds((ids) => supabase.from("delegation_beliefs_responses").select("participant_session_id, question_id, score").in("participant_session_id", ids), psIds),
    fetchByIds((ids) => supabase.from("delegation_beliefs_results").select("participant_session_id, trust_control_avg, team_outcomes_avg, workload_resources_avg, strongest_barrier_domains").in("participant_session_id", ids), psIds),
    fetchByIds(
      (ids) =>
        supabase
          .from("priority_delegation_opportunities")
          .select("participant_session_id, selection_order, leverage_level_snapshot, responsibilities(label)")
          .in("participant_session_id", ids)
          .order("selection_order", { ascending: true }),
      psIds,
    ),
    fetchByIds((ids) => supabase.from("priority_delegation_pressure_test").select("participant_session_id, response, revisited").in("participant_session_id", ids), psIds),
    fetchByIds((ids) => supabase.from("executive_support_audit_responses").select("participant_session_id, question_id, selected_layer").in("participant_session_id", ids), psIds),
    fetchByIds((ids) => supabase.from("executive_support_audit_results").select("participant_session_id, execution_score, orchestration_score, strategic_score, systems_score, primary_layers, secondary_layers").in("participant_session_id", ids), psIds),
    fetchByIds((ids) => supabase.from("assessment_results").select("participant_session_id, assessment_id, overall_result, interpretation, total_points, internal_percentage, strongest_constraints").in("participant_session_id", ids), psIds),
    fetchByIds(
      (ids) =>
        supabase
          .from("architecture_recommendations")
          .select("participant_session_id, primary_signal_type, primary_leverage_need, leading_leverage_need, multi_layer_levels, secondary_leverage_needs, audit_corroboration, recommended_primary_architecture, primary_recommended_action, reaction, reaction_note")
          .in("participant_session_id", ids),
      psIds,
    ),
    fetchByIds((ids) => supabase.from("participant_reflections").select("participant_session_id, white_whale, success_vision, success_vision_white_whale_followup").in("participant_session_id", ids), psIds),
    fetchByIds((ids) => supabase.from("workshop_feedback").select("participant_session_id, rating, written_feedback, permission").in("participant_session_id", ids), psIds),
    fetchByIds((ids) => supabase.from("follow_up_interests").select("participant_session_id, requested_at, status").in("participant_session_id", ids), psIds),
  ]);

  // Question text lives in dedicated config tables -- fetched once by id.
  const responseQuestionIds = [...new Set(responses.map((r) => r.question_id))];
  const beliefQuestionIds = [...new Set(beliefResponses.map((r) => r.question_id))];
  const auditQuestionIds = [...new Set(auditResponses.map((r) => r.question_id))];
  const assessmentIds = [...new Set(diagnosticResults.map((r) => r.assessment_id))];

  const [questions, options, beliefQuestions, auditQuestions] = await Promise.all([
    fetchByIds((ids) => supabase.from("questions").select("id, prompt, assessment_id").in("id", ids), responseQuestionIds),
    fetchByIds((ids) => supabase.from("answer_options").select("question_id, label, value").in("question_id", ids), responseQuestionIds),
    fetchByIds((ids) => supabase.from("delegation_beliefs_questions").select("id, prompt, section").in("id", ids), beliefQuestionIds),
    fetchByIds(
      (ids) =>
        supabase
          .from("executive_support_audit_questions")
          .select("id, prompt, option_execution, option_orchestration, option_strategic, option_systems")
          .in("id", ids),
      auditQuestionIds,
    ),
  ]);

  // Second step: assessment names, needed for both the raw-answer rows
  // (via the question's assessment) and the calculated-result rows.
  const assessmentsForResults = await fetchByIds(
    (ids) => supabase.from("assessments").select("id, name").in("id", ids),
    [...new Set([...assessmentIds, ...questions.map((q) => q.assessment_id)])],
  );

  const participantById = new Map(participants.map((p) => [p.id, p]));
  const sessionNameById = new Map(sessions.map((s) => [s.id, s.name]));
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const assessmentNameById = new Map(assessmentsForResults.map((a) => [a.id, a.name]));
  const beliefQuestionById = new Map(beliefQuestions.map((q) => [q.id, q]));
  const auditQuestionById = new Map(auditQuestions.map((q) => [q.id, q]));
  const optionLabel = (questionId: string, raw: unknown): string => {
    const match = options.find((o) => o.question_id === questionId && o.value === raw);
    return match?.label ?? (typeof raw === "string" ? raw : JSON.stringify(raw));
  };

  const byPs = <T extends { participant_session_id: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) map.set(r.participant_session_id, [...(map.get(r.participant_session_id) ?? []), r]);
    return map;
  };
  const responsesByPs = byPs(responses);
  const zoneByPs = byPs(zoneRows);
  const beliefRespByPs = byPs(beliefResponses);
  const beliefResultByPs = byPs(beliefResults);
  const priorityByPs = byPs(priorities);
  const pressureByPs = byPs(pressureTests);
  const auditRespByPs = byPs(auditResponses);
  const auditResultByPs = byPs(auditResults);
  const diagResultByPs = byPs(diagnosticResults);
  const archByPs = byPs(architecture);
  const reflectionByPs = byPs(reflections);
  const feedbackByPs = byPs(feedback);
  const followUpByPs = byPs(followUps);

  const rows: FullExportRow[] = [];
  const intakeEmitted = new Set<string>();

  // Stable order: participant, then their sessions in the order handed in.
  for (const enrollment of enrollments) {
    const p = participantById.get(enrollment.participant_id);
    if (!p) continue;
    const name = `${p.first_name} ${p.last_name}`;
    const sessionName = sessionNameById.get(enrollment.session_id) ?? "[Deleted session]";
    const add = (module: string, question: string, answer: string | number | null | undefined) => {
      if (answer === null || answer === undefined || answer === "") return;
      rows.push({
        participant: safeCell(name),
        email: safeCell(p.email),
        session: safeCell(sessionName),
        module,
        question: safeCell(question),
        answer: safeCell(String(answer)),
      });
    };
    const psId = enrollment.id;

    // Intake belongs to the person, not one session -- emit it once.
    if (!intakeEmitted.has(p.id)) {
      intakeEmitted.add(p.id);
      const intakeSession = "(Intake -- applies to every session)";
      const addIntake = (question: string, answer: string | null | undefined) => {
        if (!answer) return;
        rows.push({ participant: safeCell(name), email: safeCell(p.email), session: intakeSession, module: "Intake", question, answer: safeCell(answer) });
      };
      addIntake("Company", p.company_name);
      addIntake("Role / title", p.current_role_title);
      addIntake(
        "Current executive support",
        formatCurrentSupport({
          currentSupportPersonalAssistant: p.current_support_personal_assistant,
          currentSupportAdminOrVa: p.current_support_admin_or_va,
          currentSupportExecutiveAssistant: p.current_support_executive_assistant,
          currentSupportSeniorExecutiveAssistant: p.current_support_senior_executive_assistant,
          currentSupportHeadOfOperations: p.current_support_head_of_operations,
          currentSupportChiefOfStaff: p.current_support_chief_of_staff,
          currentSupportChiefIntegrator: p.current_support_chief_integrator,
          currentSupportCoo: p.current_support_coo,
          currentSupportAiAutomation: p.current_support_ai_automation,
          currentSupportOther: p.current_support_other,
          currentSupportOtherText: p.current_support_other_text,
          currentSupportNone: p.current_support_none,
        }),
      );
      addIntake(
        "Whole-business operating system",
        p.whole_business_os ? `${p.whole_business_os}${p.whole_business_os_other_text ? ` (${p.whole_business_os_other_text})` : ""}` : null,
      );
      addIntake("Intake completed at", p.intake_completed_at);
    }

    add("Session enrollment", "Completion state", enrollment.completion_state);
    add("Session enrollment", "Started at", enrollment.started_at);
    add("Session enrollment", "Completed at", enrollment.completed_at);

    // Operating Altitude
    for (const r of responsesByPs.get(psId) ?? []) {
      const q = questionById.get(r.question_id);
      add(`Diagnostic${q ? ` -- ${assessmentNameById.get(q.assessment_id) ?? "assessment"}` : ""}`, q?.prompt ?? "[Removed question]", optionLabel(r.question_id, r.answer));
    }
    for (const r of diagResultByPs.get(psId) ?? []) {
      const resultModule = `Diagnostic -- ${assessmentNameById.get(r.assessment_id) ?? "assessment"} (calculated)`;
      add(resultModule, "Overall result", r.overall_result);
      add(resultModule, "Interpretation", r.interpretation);
      add(resultModule, "Total points", r.total_points);
      add(resultModule, "Internal percentage", r.internal_percentage);
    }
    const reflection = reflectionByPs.get(psId)?.[0];
    add("Operating Altitude -- White Whale", "White Whale", reflection?.white_whale);
    add("Operating Altitude -- Leadership Wiring", "Leadership Wiring self-identification", enrollment.self_identification);

    // Investment
    for (const z of zoneByPs.get(psId) ?? []) {
      const resp = z.responsibilities as unknown as { label: string; leverage_level: string | null } | null;
      add(
        "Investment -- Zone of Investment",
        resp?.label ?? "[Removed responsibility]",
        `Competency: ${z.competency ?? "not rated"} | Passion: ${z.passion ?? "not rated"} | Cell: ${z.matrix_cell ?? "n/a"} | Zone: ${z.macro_zone ?? "n/a"}${resp?.leverage_level ? ` | Leverage level: ${resp.leverage_level}` : ""}`,
      );
    }

    // Delegation
    for (const r of beliefRespByPs.get(psId) ?? []) {
      const q = beliefQuestionById.get(r.question_id);
      const scale = q?.section === "ownership_transfer" ? OWNERSHIP_SCALE : BELIEF_SCALE;
      add("Delegation -- Delegation Beliefs", q?.prompt ?? "[Removed question]", `${r.score} (${scale[r.score] ?? "n/a"})`);
    }
    const belief = beliefResultByPs.get(psId)?.[0];
    if (belief) {
      const m = "Delegation -- Delegation Beliefs (calculated)";
      add(m, "Trust & Control average", belief.trust_control_avg);
      add(m, "Team & Outcomes average", belief.team_outcomes_avg);
      add(m, "Workload & Resources average", belief.workload_resources_avg);
      add(m, "Strongest barrier domains", (belief.strongest_barrier_domains ?? []).join(", ") || "None above threshold");
    }
    for (const pr of priorityByPs.get(psId) ?? []) {
      const resp = pr.responsibilities as unknown as { label: string } | null;
      add("Delegation -- Priority Delegation Opportunities", `Priority ${pr.selection_order}`, `${resp?.label ?? "[Removed responsibility]"} (${pr.leverage_level_snapshot ?? "unclassified"})`);
    }
    const pressure = pressureByPs.get(psId)?.[0];
    if (pressure) {
      add("Delegation -- Priority Delegation Opportunities", "Pressure test response", `${pressure.response}${pressure.revisited ? " (revisited selections)" : ""}`);
    }

    // Leverage
    for (const r of auditRespByPs.get(psId) ?? []) {
      const q = auditQuestionById.get(r.question_id);
      const optionText = q ? (q as unknown as Record<string, string>)[`option_${r.selected_layer}`] : undefined;
      add("Leverage -- Executive Support Audit", q?.prompt ?? "[Removed question]", `${optionText ?? "[Removed option]"} [${r.selected_layer}]`);
    }
    const audit = auditResultByPs.get(psId)?.[0];
    if (audit) {
      const m = "Leverage -- Executive Support Audit (calculated)";
      add(m, "Layer scores", `Execution ${audit.execution_score} | Orchestration ${audit.orchestration_score} | Strategic ${audit.strategic_score} | Systems ${audit.systems_score}`);
      add(m, "Primary leverage gaps", (audit.primary_layers ?? []).join(", "));
      add(m, "Secondary leverage gaps", (audit.secondary_layers ?? []).join(", "));
    }

    // Architecture
    const arch = archByPs.get(psId)?.[0];
    if (arch) {
      const m = "Architecture (calculated)";
      add(m, "Signal type", arch.primary_signal_type);
      add(m, "Primary leverage need", arch.primary_leverage_need);
      add(m, "Leading leverage need", arch.leading_leverage_need);
      add(m, "Multi-layer levels", (arch.multi_layer_levels ?? []).join(", "));
      add(m, "Secondary leverage needs", (arch.secondary_leverage_needs ?? []).join(", "));
      add(m, "Audit corroboration", arch.audit_corroboration);
      add(m, "Recommended primary architecture", arch.recommended_primary_architecture);
      add(m, "Recommended primary action", arch.primary_recommended_action);
      add("Architecture -- participant reaction", "Does this architecture reflect the level of support required?", arch.reaction);
      add("Architecture -- participant reaction", "Optional note", arch.reaction_note);
    }

    // Success
    add("Success -- Success Vision", "Success Vision", reflection?.success_vision);
    add("Success -- Success Vision", "Success Vision follow-up (White Whale)", reflection?.success_vision_white_whale_followup);

    // Wrap-up
    const fb = feedbackByPs.get(psId)?.[0];
    if (fb) {
      add("Workshop feedback", "Overall rating (1-5)", fb.rating);
      add("Workshop feedback", "Written feedback", fb.written_feedback);
      add("Workshop feedback", "Permission to use feedback", fb.permission);
    }
    const followUp = followUpByPs.get(psId)?.[0];
    if (followUp) add("Follow-up", "Requested a follow-up conversation", `${followUp.requested_at} (${followUp.status})`);
  }

  return rows;
}
