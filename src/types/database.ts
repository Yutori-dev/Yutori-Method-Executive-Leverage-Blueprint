/**
 * Hand-written mirror of supabase/migrations/*.sql.
 *
 * There is no live Supabase project wired into this workspace yet, so these
 * types could not be generated with `supabase gen types typescript`. Once a
 * project exists, regenerate with:
 *
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * and delete this comment. Until then, keep this file in sync by hand with
 * any migration change.
 */

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

export interface Database {
  public: {
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      admin_users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          created_at: string;
          last_login: string | null;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          created_at?: string;
          last_login?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          sort_order: number;
          requires_live_workshop: boolean;
          active: boolean;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          sort_order: number;
          requires_live_workshop?: boolean;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          name: string;
          organization: string | null;
          event_date: string | null;
          format: SessionFormat;
          status: SessionStatus;
          join_code: string;
          active_module_id: string | null;
          architecture_revealed: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organization?: string | null;
          event_date?: string | null;
          format?: SessionFormat;
          status?: SessionStatus;
          join_code: string;
          active_module_id?: string | null;
          architecture_revealed?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      participant_sessions: {
        Row: {
          id: string;
          participant_id: string;
          session_id: string;
          current_module_id: string | null;
          completion_state: CompletionState;
          started_at: string | null;
          completed_at: string | null;
          last_active_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          session_id: string;
          current_module_id?: string | null;
          completion_state?: CompletionState;
          started_at?: string | null;
          completed_at?: string | null;
          last_active_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["participant_sessions"]["Insert"]>;
        Relationships: [];
      };
      participant_module_progress: {
        Row: {
          id: string;
          participant_session_id: string;
          module_id: string;
          status: ModuleStatus;
          started_at: string | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_session_id: string;
          module_id: string;
          status?: ModuleStatus;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["participant_module_progress"]["Insert"]
        >;
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          key: string;
          name: string;
          version: number;
          active: boolean;
          is_placeholder: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          version?: number;
          active?: boolean;
          is_placeholder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assessments"]["Insert"]>;
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          assessment_id: string;
          prompt: string;
          type: QuestionType;
          config: Record<string, unknown>;
          required: boolean;
          sort_order: number;
          active: boolean;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          prompt: string;
          type: QuestionType;
          config?: Record<string, unknown>;
          required?: boolean;
          sort_order?: number;
          active?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };
      answer_options: {
        Row: {
          id: string;
          question_id: string;
          label: string;
          value: string;
          score_value: number | null;
          sort_order: number;
          metadata: Record<string, unknown>;
          active: boolean;
        };
        Insert: {
          id?: string;
          question_id: string;
          label: string;
          value: string;
          score_value?: number | null;
          sort_order?: number;
          metadata?: Record<string, unknown>;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["answer_options"]["Insert"]>;
        Relationships: [];
      };
      responses: {
        Row: {
          id: string;
          participant_session_id: string;
          question_id: string;
          answer: unknown;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_session_id: string;
          question_id: string;
          answer: unknown;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["responses"]["Insert"]>;
        Relationships: [];
      };
    };
    Functions: {
      ensure_participant: {
        Args: { p_first_name: string; p_last_name: string };
        Returns: Database["public"]["Tables"]["participants"]["Row"];
      };
      join_session: {
        Args: { p_join_code: string };
        Returns: Database["public"]["Tables"]["participant_sessions"]["Row"];
      };
      admin_unlock_next_module: {
        Args: { p_session_id: string };
        Returns: Database["public"]["Tables"]["sessions"]["Row"];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_session_by_join_code: {
        Args: { p_join_code: string };
        Returns: {
          name: string;
          organization: string | null;
          event_date: string | null;
          format: SessionFormat;
          status: SessionStatus;
        }[];
      };
    };
  };
}
