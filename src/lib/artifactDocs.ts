/**
 * Neutral, renderer-agnostic documents for the participant-facing artifacts
 * of the new modules. ONE definition of "what the participant sees" feeds
 * three outputs -- the portal's artifacts page (also reachable after a
 * session is archived), the admin's view, and the PDF -- so they cannot
 * drift apart. Content and wording mirror the in-flow result screens
 * (ThinkingTrapsResults, LeverageAuditResults, the Start-Stop-Shift review,
 * the Handoff Screen 12), including the rule that participants never see
 * numeric scores.
 */

export interface ArtifactLine {
  text: string;
  /** Smaller muted line under the text (e.g. "Current level: Task Support"). */
  sub?: string;
  /** Extra emphasised line (e.g. "You would like greater ownership..."). */
  note?: string;
  quote?: boolean;
}
export interface ArtifactGroup {
  label?: string;
  lines: ArtifactLine[];
}
export interface ArtifactSection {
  heading?: string;
  intro?: string;
  groups: ArtifactGroup[];
  closing?: string[];
}
export interface ArtifactDoc {
  key: string;
  title: string;
  sections: ArtifactSection[];
}

export const ARTIFACT_ASSESSMENT_KEYS = [
  "thinking_traps",
  "ea_leverage_audit_visionary",
  "ea_leverage_audit_ea",
  "start_stop_shift",
  "high_leverage_handoff",
] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const line = (text: unknown): ArtifactLine => ({ text: str(text) });

export interface ArtifactSource {
  assessmentKey: string;
  config: Obj;
  answers: Obj;
  derived: Obj | null;
}

export function buildArtifactDoc(s: ArtifactSource): ArtifactDoc | null {
  const cfg = s.config;
  const a = s.answers;

  if (s.assessmentKey === "thinking_traps") {
    const qualifying = arr(s.derived?.qualifyingTraps).map(str);
    const none = isObj(cfg.no_qualifying_result) ? cfg.no_qualifying_result : {};
    const intro = isObj(cfg.result_intro) ? cfg.result_intro : {};
    if (qualifying.length === 0) {
      return { key: s.assessmentKey, title: str(none.title), sections: [{ intro: str(none.body), groups: [] }] };
    }
    const traps = arr(cfg.traps).filter(isObj);
    const sections: ArtifactSection[] = [{ intro: str(intro.body), groups: [] }];
    for (const id of qualifying) {
      const t = traps.find((x) => str(x.id) === id);
      if (!t) continue;
      sections.push({
        heading: str(t.name),
        groups: [
          { lines: [{ text: `“${str(t.statement)}”`, quote: true }] },
          { label: "Trigger", lines: [line(t.trigger)] },
          { label: "How it shows up", lines: [line(t.how_it_shows_up)] },
          { label: "Friction", lines: [line(t.friction)] },
          { label: "Shift", lines: [line(t.shift)] },
        ],
      });
    }
    return { key: s.assessmentKey, title: str(intro.title), sections };
  }

  if (s.assessmentKey === "ea_leverage_audit_visionary" || s.assessmentKey === "ea_leverage_audit_ea") {
    if (s.derived?.noCurrentEa === true || a.noCurrentEa === true) {
      return { key: s.assessmentKey, title: str(cfg.resultHeading), sections: [{ intro: str(cfg.exitMessage), groups: [] }] };
    }
    const levels = arr(cfg.ownershipLevels).filter(isObj);
    const levelLabel = (v: unknown) => str(levels.find((l) => l.value === v)?.label);
    const macros = arr(cfg.macroCategories).filter(isObj);
    const responsibilities = arr(cfg.responsibilities).filter(isObj);
    const responses = isObj(a.responses) ? a.responses : {};
    const cur = (id: string) => (isObj(responses[id]) ? (responses[id] as Obj).current : undefined);
    const des = (id: string) => (isObj(responses[id]) ? (responses[id] as Obj).desired : undefined);
    const dEa = isObj(s.derived?.ea) ? (s.derived?.ea as Obj) : {};
    const dCos = isObj(s.derived?.cos) ? (s.derived?.cos as Obj) : {};

    const ea = responsibilities.filter((r) => r.type === "EA");
    const byMacro = (flag: string): ArtifactGroup[] =>
      macros
        .map((m) => ({
          label: str(m.name),
          lines: ea
            .filter((r) => str(r.macroCategory) === str(m.id) && isObj(dEa[str(r.id)]) && (dEa[str(r.id)] as Obj)[flag] === true)
            .map((r) => ({ text: str(r.name), sub: `Current level: ${levelLabel(cur(str(r.id)))}` })),
        }))
        .filter((g) => g.lines.length > 0);

    const sectionA = isObj(cfg.sectionA) ? cfg.sectionA : {};
    const sectionB = isObj(cfg.sectionB) ? cfg.sectionB : {};
    const sectionC = isObj(cfg.sectionC) ? cfg.sectionC : {};
    const sections: ArtifactSection[] = [];

    const groupsA = byMacro("greaterLeverageOpportunity");
    if (groupsA.length > 0) sections.push({ heading: str(sectionA.heading), intro: str(sectionA.intro), groups: groupsA });
    const groupsB = byMacro("appropriatelySupported");
    if (groupsB.length > 0) sections.push({ heading: str(sectionB.heading), intro: str(sectionB.intro), groups: groupsB });

    const cos = responsibilities.filter((r) => r.type === "COS" && isObj(dCos[str(r.id)]) && (dCos[str(r.id)] as Obj).highOwnership === true);
    if (cos.length > 0) {
      sections.push({
        heading: str(sectionC.heading),
        intro: str(sectionC.intro),
        groups: [
          {
            lines: cos.map((r) => ({
              text: str(r.name),
              sub: `Current level: ${levelLabel(cur(str(r.id)))}`,
              note: des(str(r.id)) === 1 ? str(sectionC.reactionPrefix) : undefined,
            })),
          },
        ],
        closing: [str(sectionC.closing)],
      });
    }
    if (sections.length === 0) sections.push({ intro: "Nothing qualified for a snapshot section this time.", groups: [] });
    return { key: s.assessmentKey, title: str(cfg.resultHeading), sections };
  }

  if (s.assessmentKey === "start_stop_shift") {
    const review = isObj(cfg.review) ? cfg.review : {};
    const groups = arr(cfg.categories)
      .filter(isObj)
      .map((c) => ({ label: str(c.label), lines: arr(a[str(c.id)]).map(line) }));
    return { key: s.assessmentKey, title: str(review.title), sections: [{ groups, closing: [str(review.closing)] }] };
  }

  if (s.assessmentKey === "high_leverage_handoff") {
    const review = isObj(cfg.review) ? cfg.review : {};
    const mechanisms = [...arr(a.mechanisms).map(str), ...(str(a.mechanismOther).trim() ? [`Other: ${str(a.mechanismOther).trim()}`] : [])];
    const one = (label: string | undefined, text: unknown): ArtifactGroup => ({ label, lines: [line(text)] });
    return {
      key: s.assessmentKey,
      title: str(review.title),
      sections: [
        { heading: "The Opportunity", groups: [one(undefined, a.opportunity)] },
        { heading: "Today → 90 Days", groups: [one("Today", a.today), one("90 Days", a.shift90)] },
        { heading: "Definition of Success", groups: [one(undefined, a.success)] },
        {
          heading: "Make It Stick",
          groups: [
            one("Thinking Trap to Watch", a.trap),
            { label: "My Commitment", lines: arr(a.commitments).map(line) },
            { label: "Supporting Mechanism", lines: mechanisms.map(line) },
          ],
        },
        { heading: "The Path Forward", groups: [one("First Conversation", a.firstConversation), one("30 Days", a.d30), one("90 Days", a.d90)] },
        { groups: [], closing: arr(review.closing).map(str) },
      ],
    };
  }

  return null;
}
