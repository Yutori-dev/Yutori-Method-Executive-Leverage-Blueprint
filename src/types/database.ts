/**
 * `database.generated.ts` is produced directly from the linked Supabase
 * project and should not be hand-edited. Regenerate after any migration:
 *
 *   npx supabase gen types typescript --linked > src/types/database.generated.ts
 *
 * This file re-exports it plus a thin layer of narrower string-literal
 * types for columns that are `text` + `check (...)` in Postgres (the
 * generator can't infer a union from a CHECK constraint, only from a real
 * Postgres enum type) -- kept here so app code isn't stuck typing those
 * columns as bare `string`.
 */
export type { Database, Json } from "./database.generated";

export type ModuleStatus = "not_started" | "in_progress" | "complete";
export type CompletionState = "not_started" | "in_progress" | "complete";
export type SessionStatus = "draft" | "active" | "complete" | "archived";
export type SessionFormat = "virtual" | "in_person";
export type QuestionType =
  | "multiple_choice"
  | "multi_select"
  | "rating_scale"
  | "numeric"
  | "free_text";

export type LeverageLevel = "execution" | "orchestration" | "strategic" | "systems";
export type RatingLevel = "low" | "medium" | "high";
export type MacroZone = "investment" | "ambiguity" | "vulnerability";
