"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const ASSESSMENT_KEY = "executive_leverage_diagnostic";
const ASSESSMENT_NAME = "Executive Leverage Diagnostic™";

export interface DiagnosticOptionInput {
  value: string;
  label: string;
  scoreValue: number | null;
  sortOrder: number;
  metadata: Json;
}

export interface DiagnosticQuestionInput {
  sortOrder: number;
  prompt: string;
  required: boolean;
  scored: boolean;
  dashboardVisible: boolean;
  constraintLabel: string | null;
  interpretationCopy: string | null;
  tieBreakPriority: number | null;
  options: DiagnosticOptionInput[];
}

export interface DiagnosticThresholdInput {
  minScore: number | null;
  maxScore: number | null;
  resultLabel: string;
  interpretation: string;
  sortOrder: number;
}

/**
 * Saves an edit as a brand-new assessment version -- never mutates the
 * current live rows in place, matching the versioning convention used
 * everywhere else in this schema (assessments/zone_matrix_cells/
 * recommendation_rules: editing content creates new versioned rows). RLS
 * already grants admins full CRUD on all four tables involved
 * (assessments_write_admin, questions_write_admin, answer_options_write_
 * admin, assessment_scoring_rules_admin_only), so this is plain
 * admin-authenticated table writes -- no RPC needed.
 */
export async function saveExecutiveLeverageDiagnosticVersion(input: {
  questions: DiagnosticQuestionInput[];
  thresholds: DiagnosticThresholdInput[];
}) {
  const supabase = await createServerSupabaseClient();

  const { data: latest, error: latestError } = await supabase
    .from("assessments")
    .select("version")
    .eq("key", ASSESSMENT_KEY)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { ok: false as const, message: latestError.message };

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({ key: ASSESSMENT_KEY, name: ASSESSMENT_NAME, version: nextVersion, active: true, is_placeholder: false })
    .select("id")
    .single();

  if (assessmentError || !assessment) {
    return { ok: false as const, message: assessmentError?.message ?? "Could not create new version." };
  }

  const { data: insertedQuestions, error: questionsError } = await supabase
    .from("questions")
    .insert(
      input.questions.map((q) => ({
        assessment_id: assessment.id,
        prompt: q.prompt,
        type: "multiple_choice",
        required: q.required,
        sort_order: q.sortOrder,
        scored: q.scored,
        dashboard_visible: q.dashboardVisible,
        constraint_label: q.constraintLabel,
        interpretation_copy: q.interpretationCopy,
        tie_break_priority: q.tieBreakPriority,
      })),
    )
    .select("id, sort_order");

  if (questionsError || !insertedQuestions) {
    return { ok: false as const, message: questionsError?.message ?? "Could not save questions." };
  }

  const questionIdBySortOrder = new Map(insertedQuestions.map((q) => [q.sort_order, q.id]));

  const optionRows = input.questions.flatMap((q) => {
    const questionId = questionIdBySortOrder.get(q.sortOrder);
    if (!questionId) return [];
    return q.options.map((o) => ({
      question_id: questionId,
      label: o.label,
      value: o.value,
      score_value: o.scoreValue,
      sort_order: o.sortOrder,
      metadata: o.metadata,
    }));
  });

  const { error: optionsError } = await supabase.from("answer_options").insert(optionRows);
  if (optionsError) return { ok: false as const, message: optionsError.message };

  const { error: thresholdsError } = await supabase.from("assessment_scoring_rules").insert(
    input.thresholds.map((t) => ({
      assessment_id: assessment.id,
      version: nextVersion,
      dimension: "overall_percentage",
      min_score: t.minScore,
      max_score: t.maxScore,
      result_label: t.resultLabel,
      interpretation: t.interpretation,
      sort_order: t.sortOrder,
      active: true,
    })),
  );
  if (thresholdsError) return { ok: false as const, message: thresholdsError.message };

  revalidatePath("/admin/diagnostic-config");
  return { ok: true as const, version: nextVersion };
}
