export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      answer_options: {
        Row: {
          active: boolean
          id: string
          label: string
          metadata: Json
          question_id: string
          score_value: number | null
          sort_order: number
          value: string
        }
        Insert: {
          active?: boolean
          id?: string
          label: string
          metadata?: Json
          question_id: string
          score_value?: number | null
          sort_order?: number
          value: string
        }
        Update: {
          active?: boolean
          id?: string
          label?: string
          metadata?: Json
          question_id?: string
          score_value?: number | null
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_recommendations: {
        Row: {
          calculated_at: string
          created_at: string
          id: string
          is_tied: boolean
          participant_session_id: string
          primary_result: string | null
          primary_role: string | null
          primary_signal_leverage_level: string | null
          rationale: string
          reaction: string | null
          reaction_note: string | null
          reaction_submitted_at: string | null
          rules_version: number
          secondary_result: string | null
          secondary_signal_leverage_level: string | null
          supporting_signals: Json
          updated_at: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          id?: string
          is_tied?: boolean
          participant_session_id: string
          primary_result?: string | null
          primary_role?: string | null
          primary_signal_leverage_level?: string | null
          rationale: string
          reaction?: string | null
          reaction_note?: string | null
          reaction_submitted_at?: string | null
          rules_version: number
          secondary_result?: string | null
          secondary_signal_leverage_level?: string | null
          supporting_signals?: Json
          updated_at?: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          id?: string
          is_tied?: boolean
          participant_session_id?: string
          primary_result?: string | null
          primary_role?: string | null
          primary_signal_leverage_level?: string | null
          rationale?: string
          reaction?: string | null
          reaction_note?: string | null
          reaction_submitted_at?: string | null
          rules_version?: number
          secondary_result?: string | null
          secondary_signal_leverage_level?: string | null
          supporting_signals?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_recommendations_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: true
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          assessment_id: string
          calculated_at: string
          created_at: string
          dimension_scores: Json
          id: string
          interpretation: string | null
          overall_result: string | null
          participant_session_id: string
          rules_version: number
          updated_at: string
        }
        Insert: {
          assessment_id: string
          calculated_at?: string
          created_at?: string
          dimension_scores?: Json
          id?: string
          interpretation?: string | null
          overall_result?: string | null
          participant_session_id: string
          rules_version: number
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          calculated_at?: string
          created_at?: string
          dimension_scores?: Json
          id?: string
          interpretation?: string | null
          overall_result?: string | null
          participant_session_id?: string
          rules_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scoring_rules: {
        Row: {
          active: boolean
          assessment_id: string
          dimension: string
          id: string
          interpretation: string | null
          max_score: number | null
          min_score: number | null
          result_label: string
          sort_order: number
          version: number
        }
        Insert: {
          active?: boolean
          assessment_id: string
          dimension: string
          id?: string
          interpretation?: string | null
          max_score?: number | null
          min_score?: number | null
          result_label: string
          sort_order?: number
          version?: number
        }
        Update: {
          active?: boolean
          assessment_id?: string
          dimension?: string
          id?: string
          interpretation?: string | null
          max_score?: number | null
          min_score?: number | null
          result_label?: string
          sort_order?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scoring_rules_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_placeholder: boolean
          key: string
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_placeholder?: boolean
          key: string
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_placeholder?: boolean
          key?: string
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      follow_up_interests: {
        Row: {
          id: string
          participant_session_id: string
          requested_at: string
          status: string
        }
        Insert: {
          id?: string
          participant_session_id: string
          requested_at?: string
          status?: string
        }
        Update: {
          id?: string
          participant_session_id?: string
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_interests_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: true
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          active: boolean
          description: string | null
          id: string
          key: string
          name: string
          requires_live_workshop: boolean
          sort_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          key: string
          name: string
          requires_live_workshop?: boolean
          sort_order: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          key?: string
          name?: string
          requires_live_workshop?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      participant_module_progress: {
        Row: {
          completed_at: string | null
          id: string
          module_id: string
          participant_session_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          module_id: string
          participant_session_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          module_id?: string
          participant_session_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_module_progress_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_responsibilities: {
        Row: {
          competency: string | null
          created_at: string
          id: string
          macro_zone: string | null
          matrix_cell: string | null
          participant_session_id: string
          passion: string | null
          responsibility_id: string
          updated_at: string
        }
        Insert: {
          competency?: string | null
          created_at?: string
          id?: string
          macro_zone?: string | null
          matrix_cell?: string | null
          participant_session_id: string
          passion?: string | null
          responsibility_id: string
          updated_at?: string
        }
        Update: {
          competency?: string | null
          created_at?: string
          id?: string
          macro_zone?: string | null
          matrix_cell?: string | null
          participant_session_id?: string
          passion?: string | null
          responsibility_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_responsibilities_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_responsibilities_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "responsibilities"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_reflections: {
        Row: {
          created_at: string
          id: string
          participant_session_id: string
          success_vision: string | null
          success_vision_white_whale_followup: string | null
          updated_at: string
          white_whale: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          participant_session_id: string
          success_vision?: string | null
          success_vision_white_whale_followup?: string | null
          updated_at?: string
          white_whale?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          participant_session_id?: string
          success_vision?: string | null
          success_vision_white_whale_followup?: string | null
          updated_at?: string
          white_whale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_reflections_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: true
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_sessions: {
        Row: {
          completed_at: string | null
          completion_state: string
          created_at: string
          current_module_id: string | null
          id: string
          last_active_at: string
          participant_id: string
          self_identification: string | null
          session_id: string
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_state?: string
          created_at?: string
          current_module_id?: string | null
          id?: string
          last_active_at?: string
          participant_id: string
          self_identification?: string | null
          session_id: string
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_state?: string
          created_at?: string
          current_module_id?: string | null
          id?: string
          last_active_at?: string
          participant_id?: string
          self_identification?: string | null
          session_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_sessions_current_module_id_fkey"
            columns: ["current_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_login: string | null
          last_name: string
          privacy_consent_given_at: string | null
          privacy_consent_version: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_login?: string | null
          last_name: string
          privacy_consent_given_at?: string | null
          privacy_consent_version?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_login?: string | null
          last_name?: string
          privacy_consent_given_at?: string | null
          privacy_consent_version?: string | null
        }
        Relationships: []
      }
      priority_delegation_opportunities: {
        Row: {
          created_at: string
          id: string
          leverage_level_snapshot: string
          participant_session_id: string
          responsibility_id: string
          selection_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          leverage_level_snapshot: string
          participant_session_id: string
          responsibility_id: string
          selection_order: number
        }
        Update: {
          created_at?: string
          id?: string
          leverage_level_snapshot?: string
          participant_session_id?: string
          responsibility_id?: string
          selection_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "priority_delegation_opportunities_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_delegation_opportunities_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "responsibilities"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          active: boolean
          assessment_id: string
          config: Json
          created_at: string
          id: string
          prompt: string
          required: boolean
          sort_order: number
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          assessment_id: string
          config?: Json
          created_at?: string
          id?: string
          prompt: string
          required?: boolean
          sort_order?: number
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          assessment_id?: string
          config?: Json
          created_at?: string
          id?: string
          prompt?: string
          required?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_rules: {
        Row: {
          active: boolean
          condition: Json
          created_at: string
          explanation_template: string | null
          id: string
          primary_result: string
          primary_role: string | null
          priority: number
          secondary_result: string | null
          version: number
        }
        Insert: {
          active?: boolean
          condition: Json
          created_at?: string
          explanation_template?: string | null
          id?: string
          primary_result: string
          primary_role?: string | null
          priority?: number
          secondary_result?: string | null
          version?: number
        }
        Update: {
          active?: boolean
          condition?: Json
          created_at?: string
          explanation_template?: string | null
          id?: string
          primary_result?: string
          primary_role?: string | null
          priority?: number
          secondary_result?: string | null
          version?: number
        }
        Relationships: []
      }
      responses: {
        Row: {
          answer: Json
          created_at: string
          id: string
          participant_session_id: string
          question_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answer: Json
          created_at?: string
          id?: string
          participant_session_id: string
          question_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          participant_session_id?: string
          question_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_participant_session_id_fkey"
            columns: ["participant_session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      responsibilities: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          is_placeholder: boolean
          key: string
          label: string
          leverage_level: string
          sort_order: number
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_placeholder?: boolean
          key: string
          label: string
          leverage_level: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_placeholder?: boolean
          key?: string
          label?: string
          leverage_level?: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      sessions: {
        Row: {
          active_module_id: string | null
          architecture_revealed: boolean
          created_at: string
          created_by: string | null
          event_date: string | null
          format: string
          id: string
          join_code: string
          name: string
          organization: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active_module_id?: string | null
          architecture_revealed?: boolean
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          format?: string
          id?: string
          join_code: string
          name: string
          organization?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active_module_id?: string | null
          architecture_revealed?: boolean
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          format?: string
          id?: string
          join_code?: string
          name?: string
          organization?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_active_module_id_fkey"
            columns: ["active_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_matrix_cells: {
        Row: {
          active: boolean
          cell_name: string
          competency_level: string
          explanation: string | null
          id: string
          is_placeholder: boolean
          macro_zone: string
          passion_level: string
          version: number
        }
        Insert: {
          active?: boolean
          cell_name: string
          competency_level: string
          explanation?: string | null
          id?: string
          is_placeholder?: boolean
          macro_zone: string
          passion_level: string
          version?: number
        }
        Update: {
          active?: boolean
          cell_name?: string
          competency_level?: string
          explanation?: string | null
          id?: string
          is_placeholder?: boolean
          macro_zone?: string
          passion_level?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_reveal_architecture: {
        Args: { p_session_id: string }
        Returns: {
          active_module_id: string | null
          architecture_revealed: boolean
          created_at: string
          created_by: string | null
          event_date: string | null
          format: string
          id: string
          join_code: string
          name: string
          organization: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_unlock_next_module: {
        Args: { p_session_id: string }
        Returns: {
          active_module_id: string | null
          architecture_revealed: boolean
          created_at: string
          created_by: string | null
          event_date: string | null
          format: string
          id: string
          join_code: string
          name: string
          organization: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_architecture_recommendation: {
        Args: { p_participant_session_id: string }
        Returns: {
          calculated_at: string
          created_at: string
          id: string
          is_tied: boolean
          participant_session_id: string
          primary_result: string | null
          primary_role: string | null
          primary_signal_leverage_level: string | null
          rationale: string
          reaction: string | null
          reaction_note: string | null
          reaction_submitted_at: string | null
          rules_version: number
          secondary_result: string | null
          secondary_signal_leverage_level: string | null
          supporting_signals: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "architecture_recommendations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_delegation_readiness: {
        Args: { p_assessment_key: string; p_participant_session_id: string }
        Returns: {
          assessment_id: string
          calculated_at: string
          created_at: string
          dimension_scores: Json
          id: string
          interpretation: string | null
          overall_result: string | null
          participant_session_id: string
          rules_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_participant: {
        Args: {
          p_first_name: string
          p_last_name: string
          p_privacy_consent?: boolean
        }
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_login: string | null
          last_name: string
          privacy_consent_given_at: string | null
          privacy_consent_version: string | null
        }
        SetofOptions: {
          from: "*"
          to: "participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_session_by_join_code: {
        Args: { p_join_code: string }
        Returns: {
          event_date: string
          format: string
          name: string
          organization: string
          status: string
        }[]
      }
      has_calculated_architecture: {
        Args: { p_participant_session_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_module_unlocked_for_session: {
        Args: { p_module_key: string; p_session_id: string }
        Returns: boolean
      }
      join_session: {
        Args: { p_join_code: string }
        Returns: {
          completed_at: string | null
          completion_state: string
          created_at: string
          current_module_id: string | null
          id: string
          last_active_at: string
          participant_id: string
          session_id: string
          started_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "participant_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rate_responsibility: {
        Args: {
          p_competency: string
          p_participant_session_id: string
          p_passion: string
          p_responsibility_id: string
        }
        Returns: {
          competency: string | null
          created_at: string
          id: string
          macro_zone: string | null
          matrix_cell: string | null
          participant_session_id: string
          passion: string | null
          responsibility_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "participant_responsibilities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      select_priority_delegation_opportunities: {
        Args: {
          p_participant_session_id: string
          p_responsibility_ids: string[]
        }
        Returns: {
          created_at: string
          id: string
          leverage_level_snapshot: string
          participant_session_id: string
          responsibility_id: string
          selection_order: number
        }[]
        SetofOptions: {
          from: "*"
          to: "priority_delegation_opportunities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      select_responsibilities: {
        Args: {
          p_participant_session_id: string
          p_responsibility_ids: string[]
        }
        Returns: {
          competency: string | null
          created_at: string
          id: string
          macro_zone: string | null
          matrix_cell: string | null
          participant_session_id: string
          passion: string | null
          responsibility_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "participant_responsibilities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      submit_architecture_reaction: {
        Args: {
          p_note: string
          p_participant_session_id: string
          p_reaction: string
        }
        Returns: {
          calculated_at: string
          created_at: string
          id: string
          is_tied: boolean
          participant_session_id: string
          primary_result: string | null
          primary_role: string | null
          primary_signal_leverage_level: string | null
          rationale: string
          reaction: string | null
          reaction_note: string | null
          reaction_submitted_at: string | null
          rules_version: number
          secondary_result: string | null
          secondary_signal_leverage_level: string | null
          supporting_signals: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "architecture_recommendations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
