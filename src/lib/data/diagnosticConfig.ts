import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ASSESSMENT_KEY = "executive_leverage_diagnostic";

export interface DiagnosticConfigOption {
  value: string;
  label: string;
  scoreValue: number | null;
  sortOrder: number;
}

export interface DiagnosticConfigQuestion {
  sortOrder: number;
  prompt: string;
  required: boolean;
  scored: boolean;
  dashboardVisible: boolean;
  constraintLabel: string | null;
  interpretationCopy: string | null;
  tieBreakPriority: number | null;
  options: DiagnosticConfigOption[];
}

export interface DiagnosticConfigThreshold {
  minScore: number | null;
  maxScore: number | null;
  resultLabel: string;
  interpretation: string | null;
  sortOrder: number;
}

export interface DiagnosticConfig {
  version: number | null;
  questions: DiagnosticConfigQuestion[];
  thresholds: DiagnosticConfigThreshold[];
}

/** Admin-only config editor's read side. Loads the current (highest-
 * version) Executive Leverage Diagnostic content to prefill the edit form
 * -- saving always creates a new version rather than editing these rows
 * in place (see src/lib/actions/diagnosticConfig.ts). */
export async function getExecutiveLeverageDiagnosticConfig(): Promise<DiagnosticConfig> {
  const supabase = await createServerSupabaseClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, version")
    .eq("key", ASSESSMENT_KEY)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assessment) {
    return { version: null, questions: [], thresholds: [] };
  }

  const [{ data: questions }, { data: thresholds }] = await Promise.all([
    supabase
      .from("questions")
      .select(
        "sort_order, prompt, required, scored, dashboard_visible, constraint_label, interpretation_copy, tie_break_priority, answer_options(value, label, score_value, sort_order, active)",
      )
      .eq("assessment_id", assessment.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("assessment_scoring_rules")
      .select("min_score, max_score, result_label, interpretation, sort_order")
      .eq("assessment_id", assessment.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    version: assessment.version,
    questions: (questions ?? []).map((q) => ({
      sortOrder: q.sort_order,
      prompt: q.prompt,
      required: q.required,
      scored: q.scored,
      dashboardVisible: q.dashboard_visible,
      constraintLabel: q.constraint_label,
      interpretationCopy: q.interpretation_copy,
      tieBreakPriority: q.tie_break_priority,
      options: (q.answer_options ?? [])
        .filter((o) => o.active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ value: o.value, label: o.label, scoreValue: o.score_value, sortOrder: o.sort_order })),
    })),
    thresholds: (thresholds ?? []).map((t) => ({
      minScore: t.min_score,
      maxScore: t.max_score,
      resultLabel: t.result_label,
      interpretation: t.interpretation,
      sortOrder: t.sort_order,
    })),
  };
}
