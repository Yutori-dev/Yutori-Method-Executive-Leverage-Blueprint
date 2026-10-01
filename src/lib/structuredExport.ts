/**
 * Turns one structured-assessment submission (the six config-driven modules)
 * into long-format export rows: one per question / row / derived field.
 * Question wording always comes from the config of the VERSION the
 * participant completed (spec: historical submissions stay interpretable),
 * not the current version. Pure -- no database access -- so the full-response
 * export and any future caller share it.
 */

export const STRUCTURED_MODULE_LABELS: Record<string, string> = {
  ea_experience_assessment: "EA Experience Assessment",
  thinking_traps: "Visionary Thinking Traps Diagnostic",
  ea_leverage_audit_visionary: "EA Leverage & Orchestration Audit (Visionary)",
  ea_leverage_audit_ea: "EA Leverage & Orchestration Audit (EA)",
  start_stop_shift: "Start-Stop-Shift",
  high_leverage_handoff: "High-Leverage Handoff",
};

export interface StructuredSubmissionInput {
  assessmentKey: string;
  versionNumber: number | null;
  config: Record<string, unknown>;
  status: string;
  answers: Record<string, unknown>;
  derived: Record<string, unknown> | null;
  dyadId: string | null;
  associatedExecutive: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface StructuredExportRow {
  module: string;
  question: string;
  answer: string;
  recordedAt: string;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const yesNo = (v: unknown) => (v === true ? "Yes" : "No");

export function structuredSubmissionRows(s: StructuredSubmissionInput): StructuredExportRow[] {
  const moduleLabel = STRUCTURED_MODULE_LABELS[s.assessmentKey] ?? s.assessmentKey;
  const rows: StructuredExportRow[] = [];
  const at = s.completedAt ?? s.startedAt ?? "";
  const add = (question: string, answer: unknown, recordedAt: string = at) => {
    const text = Array.isArray(answer) ? answer.map(str).join("; ") : str(answer);
    if (text === "") return;
    rows.push({ module: moduleLabel, question, answer: text, recordedAt });
  };

  add("Assessment version", s.versionNumber === null ? "" : `v${s.versionNumber}`);
  add("Status", s.status);
  add("Started at", s.startedAt, s.startedAt ?? "");
  add("Completed at", s.completedAt, s.completedAt ?? "");

  const cfg = s.config;
  const a = s.answers;

  if (s.assessmentKey === "ea_experience_assessment" || s.assessmentKey === "thinking_traps") {
    const scale = isObj(cfg.scale_values) ? cfg.scale_values : null;
    for (const q of arr(cfg.questions).filter(isObj)) {
      const prompt = str(q.prompt);
      const v = a[str(q.id)];
      if (q.type === "matrix") {
        const given = isObj(v) ? v : {};
        for (const row of arr(q.rows).filter(isObj)) add(`${prompt} -- ${str(row.label)}`, given[str(row.id)]);
      } else if (q.type === "multi_select") {
        const labels = new Map(arr(q.options).filter(isObj).map((o) => [str(o.id), str(o.label)]));
        add(prompt, arr(v).map((id) => labels.get(str(id)) ?? str(id)));
        add(`${prompt} -- Other (specified)`, a[`${str(q.id)}__other`]);
      } else if (scale && typeof v === "string") {
        add(prompt, `${v} (value ${scale[v] ?? "n/a"})`);
      } else {
        add(prompt, v);
      }
    }
  }

  if (s.assessmentKey === "thinking_traps" && s.derived) {
    const scores = isObj(s.derived.trapScores) ? s.derived.trapScores : {};
    const qualifying = arr(s.derived.qualifyingTraps).map(str);
    const threshold = typeof cfg.qualify_threshold === "number" ? cfg.qualify_threshold : null;
    const traps = arr(cfg.traps).filter(isObj);
    const nameOf = (id: string) => str(traps.find((t) => str(t.id) === id)?.name ?? id);
    for (const t of traps) {
      add(`Score -- ${str(t.name)}`, scores[str(t.id)]);
      add(`Qualifies at threshold${threshold === null ? "" : ` (>= ${threshold})`} -- ${str(t.name)}`, typeof scores[str(t.id)] === "number" ? yesNo(threshold !== null && (scores[str(t.id)] as number) >= threshold) : "");
    }
    add("Ranked qualifying traps", qualifying.map(nameOf));
    add("Top trap", qualifying[0] ? nameOf(qualifying[0]) : "");
    add("Second trap", qualifying[1] ? nameOf(qualifying[1]) : "");
    add("Third trap", qualifying[2] ? nameOf(qualifying[2]) : "");
  }

  if (s.assessmentKey === "ea_leverage_audit_visionary" || s.assessmentKey === "ea_leverage_audit_ea") {
    const ctx = isObj(a.context) ? a.context : {};
    add("No current EA", yesNo(a.noCurrentEa === true));
    for (const q of arr(cfg.contextQuestions).filter(isObj)) {
      const v = ctx[str(q.id)];
      const label = arr(q.options).filter(isObj).find((o) => str(o.value) === str(v))?.label;
      add(str(q.prompt), label ?? v);
    }
    const levels = arr(cfg.ownershipLevels).filter(isObj);
    const dirs = arr(cfg.directionOptions).filter(isObj);
    const macros = arr(cfg.macroCategories).filter(isObj);
    const responses = isObj(a.responses) ? a.responses : {};
    const derivedEa = s.derived && isObj(s.derived.ea) ? s.derived.ea : {};
    const derivedCos = s.derived && isObj(s.derived.cos) ? s.derived.cos : {};
    for (const r of arr(cfg.responsibilities).filter(isObj)) {
      const id = str(r.id);
      const resp = isObj(responses[id]) ? (responses[id] as Obj) : null;
      if (!resp) continue;
      const label = `${id} ${str(r.name)}`;
      const curLabel = levels.find((l) => l.value === resp.current)?.label;
      const desLabel = dirs.find((d) => d.value === resp.desired)?.label;
      if (r.type === "EA") add(`${label} -- Macro category`, macros.find((m) => str(m.id) === str(r.macroCategory))?.name ?? r.macroCategory);
      add(`${label} -- Current Ownership`, resp.current === undefined ? "" : `${str(resp.current)} / ${str(curLabel)}`);
      add(`${label} -- Desired Direction`, resp.desired === undefined ? "" : `${resp.desired as number > 0 ? "+" : ""}${str(resp.desired)} / ${str(desLabel)}`);
      const d = isObj(r.type === "EA" ? derivedEa[id] : derivedCos[id]) ? ((r.type === "EA" ? derivedEa[id] : derivedCos[id]) as Obj) : null;
      if (d) {
        if (r.type === "EA") {
          add(`${label} -- greater_ea_leverage_opportunity`, yesNo(d.greaterLeverageOpportunity));
          add(`${label} -- appropriately_supported_and_leveraged`, yesNo(d.appropriatelySupported));
        } else {
          const visionary = s.assessmentKey === "ea_leverage_audit_visionary";
          add(`${label} -- ${visionary ? "chief_of_staff_territory" : "above_and_beyond_ea_scope"}`, yesNo(d.highOwnership));
          add(`${label} -- ${visionary ? "growing_into_chief_of_staff_territory" : "expanded_ownership_opportunity"}`, yesNo(d.growingOwnership));
          add(`${label} -- ${visionary ? "expanded_chief_of_staff_territory" : "above_and_beyond_scope_more_desired"}`, yesNo(d.highOwnershipAndMoreDesired));
        }
      }
    }
    add("Dyad ID", s.dyadId);
    add("Associated executive", s.associatedExecutive);
  }

  if (s.assessmentKey === "start_stop_shift") {
    for (const [key, label] of [["start", "START"], ["stop", "STOP"], ["shift", "SHIFT"]] as const) {
      arr(a[key]).forEach((entry, i) => add(`${label} commitment ${i + 1}`, entry));
    }
  }

  if (s.assessmentKey === "high_leverage_handoff") {
    for (const step of arr(cfg.steps).filter(isObj)) {
      add(`${str(step.title)} -- ${str(step.prompt)}`, a[str(step.id)]);
    }
    add("Supporting mechanism -- Other (specified)", a.mechanismOther);
  }

  return rows;
}
