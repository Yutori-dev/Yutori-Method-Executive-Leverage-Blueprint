/** Structural checks run on an edited assessment config before it becomes a
 * new version -- both client-side (inline error list) and server-side (the
 * real gate). Pure, so it can be imported from either. Returns a list of
 * human-readable problems; empty means OK. */

type J = unknown;
const isObj = (v: J): v is Record<string, J> => !!v && typeof v === "object" && !Array.isArray(v);
const kind = (v: J) => (v === null ? "text" : Array.isArray(v) ? "list" : typeof v === "string" ? "text" : typeof v);
const HIDDEN = new Set(["is_current", "version"]);

function sameShape(oldV: J, newV: J, path: string, errors: string[]) {
  if (kind(oldV) !== kind(newV)) {
    errors.push(`"${path}" changed type (${kind(oldV)} -> ${kind(newV)}).`);
    return;
  }
  if (isObj(oldV) && isObj(newV)) {
    for (const k of Object.keys(oldV)) {
      if (HIDDEN.has(k) && path === "") continue;
      if (!(k in newV)) errors.push(`"${path ? `${path}.` : ""}${k}" is missing.`);
      else sameShape(oldV[k], newV[k], `${path ? `${path}.` : ""}${k}`, errors);
    }
  }
}

const REQUIRED_TEXT_KEYS = new Set(["prompt", "label", "name"]);

function walk(v: J, path: string, errors: string[]) {
  if (Array.isArray(v)) {
    const objs = v.filter(isObj);
    if (objs.length === v.length && v.length > 0 && objs.every((o) => typeof o.id === "string")) {
      const ids = objs.map((o) => String(o.id).trim());
      if (ids.some((i) => i === "")) errors.push(`"${path}" has an item with an empty id.`);
      else if (new Set(ids).size !== ids.length) errors.push(`"${path}" has duplicate ids.`);
    }
    v.forEach((item, i) => walk(item, `${path}[${i + 1}]`, errors));
  } else if (isObj(v)) {
    for (const [k, val] of Object.entries(v)) {
      if (REQUIRED_TEXT_KEYS.has(k) && typeof val === "string" && val.trim() === "") errors.push(`"${path}.${k}" can't be empty.`);
      if (typeof val === "number" && !Number.isFinite(val)) errors.push(`"${path}.${k}" must be a number.`);
      walk(val, path ? `${path}.${k}` : k, errors);
    }
  }
}

export function validateAssessmentConfig(assessmentKey: string, oldConfig: J, newConfig: J): string[] {
  const errors: string[] = [];
  if (!isObj(newConfig)) return ["The config must be an object."];
  sameShape(oldConfig, newConfig, "", errors);
  walk(newConfig, "", errors);
  const c = newConfig;

  if (assessmentKey === "thinking_traps") {
    const scale = isObj(c.scale_values) ? c.scale_values : {};
    const questions = Array.isArray(c.questions) ? c.questions.filter(isObj) : [];
    const traps = Array.isArray(c.traps) ? c.traps.filter(isObj) : [];
    const qIds = new Set(questions.map((q) => String(q.id)));
    for (const q of questions) {
      for (const o of Array.isArray(q.options) ? q.options : []) {
        if (!(String(o) in scale)) errors.push(`Response option "${String(o)}" (question ${String(q.id)}) has no internal value in the scale.`);
      }
    }
    for (const t of traps) {
      for (const qid of Array.isArray(t.question_ids) ? t.question_ids : []) {
        if (!qIds.has(String(qid))) errors.push(`Trap "${String(t.name)}" is mapped to unknown question "${String(qid)}".`);
      }
    }
    const tieIds = new Set((Array.isArray(c.tie_break_order) ? c.tie_break_order : []).map(String));
    for (const t of traps) if (!tieIds.has(String(t.id))) errors.push(`Trap "${String(t.name)}" is missing from the tie-break order.`);
    if (typeof c.max_results !== "number" || c.max_results < 1) errors.push("Maximum results must be at least 1.");
  }

  if (assessmentKey === "ea_leverage_audit_visionary" || assessmentKey === "ea_leverage_audit_ea") {
    const levels = Array.isArray(c.ownershipLevels) ? c.ownershipLevels.filter(isObj) : [];
    if (new Set(levels.map((l) => l.value)).size !== levels.length) errors.push("Current Ownership internal values must be unique.");
    const dirs = Array.isArray(c.directionOptions) ? c.directionOptions.filter(isObj) : [];
    if (new Set(dirs.map((d) => d.value)).size !== dirs.length) errors.push("Desired Direction internal values must be unique.");
    const macros = new Set((Array.isArray(c.macroCategories) ? c.macroCategories.filter(isObj) : []).map((m) => String(m.id)));
    for (const r of Array.isArray(c.responsibilities) ? c.responsibilities.filter(isObj) : []) {
      if (r.type === "EA" && !macros.has(String(r.macroCategory))) errors.push(`Responsibility "${String(r.name)}" uses an unknown macro category.`);
    }
    if (isObj(c.rules)) {
      const topN = c.rules.topN;
      if (typeof topN !== "number" || !Number.isInteger(topN) || topN < 1) errors.push('Rules: "topN" must be a whole number of at least 1.');
    }
  }

  const questions = Array.isArray(c.questions) ? c.questions.filter(isObj) : [];
  for (const q of questions) {
    if (q.type === "multi_select" && typeof q.max === "number" && typeof q.min === "number" && q.max < q.min) {
      errors.push(`Question "${String(q.id)}": maximum selections is below the minimum.`);
    }
    if (q.type === "multi_select" && typeof q.max === "number" && q.max < 1) errors.push(`Question "${String(q.id)}": maximum selections must be at least 1.`);
  }
  return errors;
}
