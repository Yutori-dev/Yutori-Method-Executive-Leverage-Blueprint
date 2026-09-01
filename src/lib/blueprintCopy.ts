import type { LeverageLevel, SelfIdentification } from "@/types/database";
import type { DelegationDomain } from "@/lib/delegationBeliefsConstants";
import { DOMAIN_LABEL } from "@/lib/delegationBeliefsConstants";
import type { PersonalizedPlacement } from "@/lib/data/zoneOfInvestment";

/**
 * Locked deterministic copy + pure classification logic for the Executive
 * Leverage Blueprint's five numbered territories (client "Blueprint
 * Generation, Display Logic & Dynamic Content" guide, 2026-09-01). Plain
 * module, not `server-only` -- mirrors executiveSupportArchitectureCopy.ts's
 * role: both BlueprintView.tsx (client-importable) and
 * BlueprintPdfDocument.tsx need the same lookup tables and classifiers so
 * copy can never drift between the two renderers. The server-only loader
 * (src/lib/data/blueprint.ts) calls these same functions against already-
 * fetched data rather than duplicating the classification inline -- that
 * shared call is the actual consistency guarantee, not just code reuse.
 */

// ---------------------------------------------------------------------------
// Section 01 -- Leadership Capacity Map Distribution
// ---------------------------------------------------------------------------

export interface CapacityMapPercentages {
  investmentPct: number;
  ambiguityPct: number;
  vulnerabilityPct: number;
}

type Zone = "investment" | "ambiguity" | "vulnerability";
const ZONE_ORDER: Zone[] = ["investment", "ambiguity", "vulnerability"];

/**
 * Zone % = mapped-in-zone / total-mapped * 100, denominator already
 * mapped-only at the source (zoneOfInvestment.ts). Independent per-zone
 * Math.round() (the only place % was computed before this, client-side in
 * ZoneOfInvestmentFlow.tsx) can produce 99%/101% -- this uses the largest-
 * remainder method instead, so the three values always sum to exactly 100.
 * Ties in the remainder are broken by a fixed zone order (Investment >
 * Ambiguity > Vulnerability) so the result is deterministic across renders.
 * Returns null only when nothing has been mapped (no data to normalize).
 */
export function normalizeZonePercentages(counts: {
  investment: number;
  ambiguity: number;
  vulnerability: number;
}): CapacityMapPercentages | null {
  const total = counts.investment + counts.ambiguity + counts.vulnerability;
  if (total === 0) return null;

  const exact = ZONE_ORDER.map((z) => (counts[z] / total) * 100);
  const floors = exact.map(Math.floor);
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);

  const byRemainder = ZONE_ORDER.map((z, i) => ({ i, frac: exact[i] - floors[i] })).sort(
    (a, b) => b.frac - a.frac || a.i - b.i,
  );

  const pct = [...floors];
  for (let k = 0; k < remainder; k++) pct[byRemainder[k].i] += 1;

  return { investmentPct: pct[0], ambiguityPct: pct[1], vulnerabilityPct: pct[2] };
}

export type CapacityPatternKey =
  | "INVESTMENT_DOMINANT"
  | "AMBIGUITY_DOMINANT"
  | "VULNERABILITY_DOMINANT"
  | "INVESTMENT_AMBIGUITY"
  | "INVESTMENT_VULNERABILITY"
  | "AMBIGUITY_VULNERABILITY"
  | "BALANCED";

export const CAPACITY_PATTERN_COPY: Record<CapacityPatternKey, string> = {
  INVESTMENT_DOMINANT:
    "Most of your mapped capacity is already concentrated in work where your competency and energy are strongest. The opportunity is to protect that investment and scrutinize the work outside it.",
  AMBIGUITY_DOMINANT:
    "Much of your capacity sits in work that may be easy to justify keeping because you can do it well. This is the territory where capability is most likely to be mistaken for necessary ownership.",
  VULNERABILITY_DOMINANT:
    "A significant share of your capacity is going to work with lower competency, lower energy or both. These responsibilities deserve immediate scrutiny for a different owner or support structure.",
  INVESTMENT_AMBIGUITY:
    "Your capacity is split between high-value work and work that can look reasonable for you to keep. Protecting the first depends on being more selective about the second.",
  INVESTMENT_VULNERABILITY:
    "You have meaningful capacity in high-value work, but a comparable share remains exposed to work that costs more than it returns. Moving that burden creates room to protect your strongest contribution.",
  AMBIGUITY_VULNERABILITY:
    "Most of your capacity sits outside the Zone of Investment. The immediate opportunity is to examine which responsibilities still depend on you without sufficient reason.",
  BALANCED:
    "Your capacity is distributed across all three zones rather than concentrated in one. The opportunity is to become more intentional about which work deserves continued access to you.",
};

const ZONE_DOMINANT_KEY: Record<Zone, CapacityPatternKey> = {
  investment: "INVESTMENT_DOMINANT",
  ambiguity: "AMBIGUITY_DOMINANT",
  vulnerability: "VULNERABILITY_DOMINANT",
};

const TWO_ZONE_KEY: Record<string, CapacityPatternKey> = {
  "ambiguity+investment": "INVESTMENT_AMBIGUITY",
  "investment+vulnerability": "INVESTMENT_VULNERABILITY",
  "ambiguity+vulnerability": "AMBIGUITY_VULNERABILITY",
};

/**
 * dominant/secondary classification per spec: max-min <= 15pts -> BALANCED;
 * else if the top two zones are each >=30% and within 10pts of each other,
 * a two-zone pattern; else the single-dominant pattern of the top zone.
 */
export function classifyCapacityMapPattern(pcts: CapacityMapPercentages): {
  patternKey: CapacityPatternKey;
  insight: string;
} {
  const zones: { zone: Zone; pct: number }[] = [
    { zone: "investment", pct: pcts.investmentPct },
    { zone: "ambiguity", pct: pcts.ambiguityPct },
    { zone: "vulnerability", pct: pcts.vulnerabilityPct },
  ];
  const max = Math.max(...zones.map((z) => z.pct));
  const min = Math.min(...zones.map((z) => z.pct));

  let patternKey: CapacityPatternKey;
  if (max - min <= 15) {
    patternKey = "BALANCED";
  } else {
    const [top, second] = [...zones].sort((a, b) => b.pct - a.pct);
    if (top.pct >= 30 && second.pct >= 30 && top.pct - second.pct <= 10) {
      patternKey = TWO_ZONE_KEY[[top.zone, second.zone].sort().join("+")];
    } else {
      patternKey = ZONE_DOMINANT_KEY[top.zone];
    }
  }

  return { patternKey, insight: CAPACITY_PATTERN_COPY[patternKey] };
}

// ---------------------------------------------------------------------------
// Section 01 -- Leadership Wiring
// ---------------------------------------------------------------------------

export const LEADERSHIP_WIRING_COPY: Record<SelfIdentification, { shortDescription: string; patternInsight: string }> = {
  visionary: {
    shortDescription: "You are naturally wired toward possibility, ideas and future direction.",
    patternInsight:
      "Your leverage grows when you protect capacity for direction-setting and pair it with strong coordination and follow-through.",
  },
  integrator: {
    shortDescription: "You are naturally wired toward coherence, prioritization and disciplined execution.",
    patternInsight:
      "Your leverage grows when you protect capacity for prioritization and execution while moving work that does not require your ownership.",
  },
  hybrid: {
    shortDescription: "You naturally flex between direction-setting and integration.",
    patternInsight:
      "Your leverage grows when you choose deliberately where to operate as Visionary versus Integrator rather than carrying both by default.",
  },
};

/** Visionary -> right hemisphere, Integrator -> left, Hybrid -> both.
 * Inactive hemisphere stays visible but subdued, never hidden. */
export function getHemisphereState(wiring: SelfIdentification): { leftActive: boolean; rightActive: boolean } {
  return {
    leftActive: wiring === "integrator" || wiring === "hybrid",
    rightActive: wiring === "visionary" || wiring === "hybrid",
  };
}

// ---------------------------------------------------------------------------
// Section 01 -- Delegation Beliefs (relative bars + Biggest Impediment)
// ---------------------------------------------------------------------------

export type DelegationStatusLabel = "STRONGEST HOLD" | "CO-STRONGEST HOLD" | "MODERATE" | "LEAST LIMITING";

export interface BiggestImpediment {
  kind: "single" | "two_way" | "none_dominant";
  domains: DelegationDomain[];
  headline: string;
  interpretation: string;
}

const SINGLE_IMPEDIMENT_COPY: Record<DelegationDomain, string> = {
  trust_control: "You are most likely to hold on because staying involved can feel faster, safer or closer to your standard.",
  team_outcomes:
    "You are most likely to hold on when you are not confident someone else will deliver the outcome at the standard you expect.",
  workload_resources:
    "You may be ready to delegate more, but perceive insufficient capacity, capability or budget around you to absorb the work well.",
};

const TWO_WAY_IMPEDIMENT_COPY: Record<string, string> = {
  "team_outcomes+trust_control":
    "Ownership may stay with you because both trust in the person and confidence in the outcome need to increase before you fully let go.",
  "trust_control+workload_resources":
    "Ownership may stay with you because letting go requires both greater trust and stronger capacity around you.",
  "team_outcomes+workload_resources":
    "Ownership may stay with you because you are not yet confident the available team and resources can carry the work to the required standard.",
};

const NONE_DOMINANT_INTERPRETATION =
  "No single belief stands out as the primary constraint. Your delegation pattern is likely shaped by a combination of trust, team confidence and available resources.";

/** One-line explainer under each Delegation Beliefs bar -- from the v5
 * visual reference (not in the original text spec), verbatim. */
export const DOMAIN_CAPTION: Record<DelegationDomain, string> = {
  trust_control: "How readily you hand over judgment calls, not just tasks.",
  team_outcomes: "How much you trust the team to deliver the standard you expect.",
  workload_resources: "Whether you believe the capacity and budget exist to delegate.",
};

/** Fixed framing tags on two of Section 01's four cards -- from the v5
 * visual reference. Leadership Wiring is framed as an asset already in
 * place; Delegation Beliefs as the area to work on. Not present on the
 * Executive Leverage Profile or Capacity Map cards in that reference. */
export const LEADERSHIP_WIRING_EYEBROW = "WORKING FOR YOU";
export const DELEGATION_BELIEFS_EYEBROW = "NEEDS ATTENTION";

/**
 * Pure switch on the existing `strongest_barrier_domains` SQL output
 * (calculate_delegation_beliefs_results, already handles ties). Length 0
 * (below-threshold, no domain cleared the "low" bar) and length 3 (a
 * genuine three-way tie at a real elevated value) read identically to the
 * participant -- neither case has a standout constraint to name -- so both
 * map to the same "no single dominant impediment" state deliberately; this
 * is not a bug, don't split it into a third state.
 */
export function classifyBiggestImpediment(strongestBarrierDomains: DelegationDomain[]): BiggestImpediment {
  const len = strongestBarrierDomains.length;

  if (len === 0 || len === 3) {
    return {
      kind: "none_dominant",
      domains: [],
      headline: "NO SINGLE DOMINANT IMPEDIMENT",
      interpretation: NONE_DOMINANT_INTERPRETATION,
    };
  }

  if (len === 1) {
    const domain = strongestBarrierDomains[0];
    return {
      kind: "single",
      domains: [domain],
      headline: `BIGGEST IMPEDIMENT: ${DOMAIN_LABEL[domain].toUpperCase()}`,
      interpretation: SINGLE_IMPEDIMENT_COPY[domain],
    };
  }

  const sorted = [...strongestBarrierDomains].sort() as DelegationDomain[];
  return {
    kind: "two_way",
    domains: sorted,
    headline: `BIGGEST IMPEDIMENTS: ${sorted.map((d) => DOMAIN_LABEL[d].toUpperCase()).join(" + ")}`,
    interpretation: TWO_WAY_IMPEDIMENT_COPY[sorted.join("+")] ?? "",
  };
}

/**
 * Drives the 3 relative-bar status labels off the *same* classification
 * classifyBiggestImpediment already produced, rather than an independently
 * sorted list, so the bar labels and the Biggest Impediment headline can
 * never disagree. none_dominant -> all 3 labels null (bars still show
 * relative widths, just no STRONGEST HOLD/MODERATE/LEAST LIMITING text).
 */
export function rankDelegationBeliefStatuses(
  avgs: Record<DelegationDomain, number>,
  impediment: BiggestImpediment,
): Record<DelegationDomain, DelegationStatusLabel | null> {
  const result: Record<DelegationDomain, DelegationStatusLabel | null> = {
    trust_control: null,
    team_outcomes: null,
    workload_resources: null,
  };
  if (impediment.kind === "none_dominant") return result;

  const strongestLabel: DelegationStatusLabel = impediment.kind === "two_way" ? "CO-STRONGEST HOLD" : "STRONGEST HOLD";
  for (const d of impediment.domains) result[d] = strongestLabel;

  const remaining = (["trust_control", "team_outcomes", "workload_resources"] as DelegationDomain[])
    .filter((d) => !impediment.domains.includes(d))
    .sort((a, b) => avgs[b] - avgs[a]);

  remaining.forEach((d, i) => {
    result[d] = remaining.length === 1 ? "LEAST LIMITING" : i === 0 ? "MODERATE" : "LEAST LIMITING";
  });

  return result;
}

// ---------------------------------------------------------------------------
// Section 04 -- Highest Value Focus
// ---------------------------------------------------------------------------

const INVESTMENT_CELL_RANK: Record<string, number> = {
  "Zone of Genius": 0,
  "Zone of Strength": 1,
  "Zone of Potential": 2,
};

/**
 * Investment-zone responsibilities, all of them if <=4, else the top 4
 * ranked Genius > Strength > Potential, preserving relative order within
 * the same cell (a stable sort with an explicit index tiebreak, so web and
 * PDF -- which must render identically -- can't diverge on tie order).
 */
export function selectHighestValueFocus(placements: PersonalizedPlacement[]): PersonalizedPlacement[] {
  const investment = placements.filter((p) => p.macroZone === "investment");
  if (investment.length <= 4) return investment;

  return investment
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const rankDiff = (INVESTMENT_CELL_RANK[a.p.cellName] ?? 99) - (INVESTMENT_CELL_RANK[b.p.cellName] ?? 99);
      return rankDiff !== 0 ? rankDiff : a.index - b.index;
    })
    .slice(0, 4)
    .map((x) => x.p);
}

// ---------------------------------------------------------------------------
// Section 03 -- leverage-type taglines (hoisted out of ArchitecturePyramid.tsx
// so Section 03's summary panel and the PDF mini pyramid can read them
// without owning a second copy)
// ---------------------------------------------------------------------------

export const LEVEL_TAGLINE: Record<LeverageLevel, string> = {
  strategic: "Leadership Leverage",
  orchestration: "Coordination Leverage",
  execution: "Task Leverage",
  systems: "Leverage that amplifies every layer",
};

/** Same hoist as LEVEL_TAGLINE -- Section 03's "Recommended Architecture"
 * card needs the role/support family list without importing
 * ArchitecturePyramid.tsx (a web-DOM component the PDF renderer can't use). */
export const LEVEL_ROLES: Record<LeverageLevel, string[]> = {
  strategic: ["Chief of Staff", "Chief Integrator", "COO"],
  orchestration: ["Executive Assistant", "Senior Executive Assistant"],
  execution: ["Personal Assistant", "Administrative Assistant / Virtual Assistant"],
  systems: ["AI agents", "Automated workflows", "Supporting technology infrastructure"],
};

/**
 * Section 03's "Recommended Architecture" card shows a short deterministic
 * action label ("Strengthen Orchestration Leverage") next to the role
 * family -- distinct from the longer recommendation-engine action copy
 * (`actionCopy()` in executiveSupportArchitectureCopy.ts, e.g. "You already
 * have support positioned at the Orchestration layer...") which belongs to
 * "Next Move" instead. Confirmed against the v5 visual reference: the two
 * headings show genuinely different copy, not the same string twice.
 * Keyed by the same action codes calculate_executive_support_architecture
 * already returns as primary/secondaryRecommendedActions.
 */
export const ACTION_SHORT_LABEL: Record<string, string> = {
  strengthen_execution: "Strengthen Execution Leverage",
  add_execution: "Add Execution Leverage",
  strengthen_orchestration: "Strengthen Orchestration Leverage",
  evolve_or_add_orchestration: "Evolve or Add Orchestration Leverage",
  add_orchestration: "Add Orchestration Leverage",
  strengthen_strategic: "Strengthen Strategic Leverage",
  add_strategic_from_orchestration: "Add Strategic Leverage",
  add_strategic: "Add Strategic Leverage",
  strengthen_systems: "Strengthen Systems Leverage",
  add_systems: "Add Systems Leverage",
};

/** Section 03's small Primary/Secondary summary panel spells Systems out as
 * "SYSTEMS LEVERAGE" (matching the client spec's own section-14 example
 * verbatim), while every other level and the Recommended Architecture
 * panel's headline show the plain level name -- an intentional, narrow
 * exception, not a general renaming of LEVEL_LABEL. */
export function summaryLevelDisplay(level: LeverageLevel): string {
  return level === "systems" ? "SYSTEMS LEVERAGE" : level.toUpperCase();
}

// ---------------------------------------------------------------------------
// Section 04 / 05 / footer -- fixed copy
// ---------------------------------------------------------------------------

export const WHITE_WHALE_SUPPORTING_COPY = "This meaningful ambition has remained on the horizon longer than it should have.";

export const CHARACTER_FIT_CARDS: { title: string; body: string }[] = [
  {
    title: "DEEPER CHARACTER PROFILE",
    body: "Understand the patterns and preferences that shape how you lead and work with others.",
  },
  {
    title: "COMPLEMENT & COUNTERBALANCE",
    body: "Identify where similarity supports alignment and where opposite strengths create leverage.",
  },
  {
    title: "ROLE DESIGN & FIT",
    body: "Define the right scope, authority and expectations for the leverage you need.",
  },
  {
    title: "THE RIGHT PERSON",
    body: "Find and engage the person who can create the leverage this architecture requires.",
  },
];

export const CHARACTER_FIT_MARKER = "TO BE COMPLETED IN THE IN-PERSON WORKSHOP";

export const BLUEPRINT_FOOTER_PRIMARY = "DEFINE THE OWNERSHIP BEFORE YOU DEFINE THE ROLE.";
export const BLUEPRINT_FOOTER_SECONDARY = "RIGHT OWNERSHIP. RIGHT SUPPORT. MAXIMUM LEVERAGE.";

/** The 5 section subtitles, verbatim from the v5 visual reference (not in
 * the original text spec). */
export const SECTION_SUBTITLE = {
  operatingAltitude: "Your current reality.",
  ownershipToTransfer: "The three opportunities with the greatest potential to create near-term capacity.",
  officeOfTheCeo: "The structure to unlock leverage.",
  whatThisMakesPossible: "The impact of leverage in your life.",
  characterFit: "The next step: your ideal right-hand role.",
} as const;
