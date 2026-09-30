/** Start-Stop-Shift's config shape -- see the migration's comment for why
 * this doesn't reuse structuredAssessmentSchema's question types. */
export interface StartStopShiftCategory {
  id: "start" | "stop" | "shift";
  label: string;
  prompt: string;
  helper: string;
  field_prefix: string;
  example: string;
}

export interface StartStopShiftConfig {
  intro: { title: string; body: string[] };
  categories: StartStopShiftCategory[];
  review: { title: string; closing: string };
}

export type StartStopShiftAnswers = Record<string, string[]>;

export function missingStartStopShiftCategories(
  config: StartStopShiftConfig,
  answers: StartStopShiftAnswers,
): string[] {
  return config.categories.filter((c) => (answers[c.id] ?? []).length === 0).map((c) => c.id);
}
