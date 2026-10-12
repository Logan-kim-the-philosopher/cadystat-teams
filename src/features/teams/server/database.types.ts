export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      meeting_api_key_role_events: {
        Row: {
          api_key_id: string
          created_at: string
          id: number
          next_role: string
          previous_role: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          id?: never
          next_role: string
          previous_role: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          id?: never
          next_role?: string
          previous_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_api_key_role_events_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "meeting_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_api_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          role: string
          window_count: number
          window_started_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          role?: string
          window_count?: number
          window_started_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          role?: string
          window_count?: number
          window_started_at?: string
        }
        Relationships: []
      }
      meeting_api_mutations: {
        Row: {
          api_key_id: string
          created_at: string
          meeting_note_id: string
          operation: string
          payload_hash: string
          request_id: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          meeting_note_id: string
          operation: string
          payload_hash: string
          request_id: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          meeting_note_id?: string
          operation?: string
          payload_hash?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_api_mutations_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "meeting_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_api_mutations_meeting_note_id_fkey"
            columns: ["meeting_note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_api_uploads: {
        Row: {
          api_key_id: string
          created_at: string
          meeting_note_id: string | null
          payload_hash: string
          request_id: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          meeting_note_id?: string | null
          payload_hash: string
          request_id: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          meeting_note_id?: string | null
          payload_hash?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_api_uploads_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "meeting_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_api_uploads_meeting_note_id_fkey"
            columns: ["meeting_note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_comments: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          meeting_note_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          meeting_note_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          meeting_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_comments_meeting_note_id_fkey"
            columns: ["meeting_note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_note_tickets: {
        Row: {
          created_at: string
          meeting_note_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          meeting_note_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          meeting_note_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_note_tickets_meeting_note_id_fkey"
            columns: ["meeting_note_id"]
            isOneToOne: false
            referencedRelation: "meeting_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_note_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          meeting_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          meeting_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          meeting_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          gender: string | null
          id: string
          name: string
          reports_to: string | null
          sort_order: number
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gender?: string | null
          id?: string
          name: string
          reports_to?: string | null
          sort_order?: number
          team_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gender?: string | null
          id?: string
          name?: string
          reports_to?: string | null
          sort_order?: number
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          lead_member_id: string | null
          name: string
          parent_team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_member_id?: string | null
          name: string
          parent_team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_member_id?: string | null
          name?: string
          parent_team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_lead_member_fk"
            columns: ["lead_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_api_mutations: {
        Row: {
          api_key_id: string
          created_at: string
          operation: string
          payload_hash: string
          request_id: string
          result: Json
          target: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          operation: string
          payload_hash: string
          request_id: string
          result: Json
          target: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          operation?: string
          payload_hash?: string
          request_id?: string
          result?: Json
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_api_mutations_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "meeting_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          created_at: string
          event: string
          id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_statuses: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string
          id: string
          status_id: string
          team_id: string | null
          ticket_number: string
          title: string
          type_id: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          id?: string
          status_id: string
          team_id?: string | null
          ticket_number?: string
          title: string
          type_id: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          id?: string
          status_id?: string
          team_id?: string | null
          ticket_number?: string
          title?: string
          type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_meeting_comment: {
        Args: { p_author?: string; p_body: string; p_meeting_id: string }
        Returns: string
      }
      add_ticket_comment: {
        Args: { p_author: string; p_body: string; p_ticket_number: string }
        Returns: Json
      }
      agent_ticket_json: {
        Args: {
          p_details?: boolean
          p_ticket: Database["public"]["Tables"]["tickets"]["Row"]
        }
        Returns: Json
      }
      authorize_agent_api_key: {
        Args: { p_admin?: boolean; p_key_hash: string }
        Returns: Json
      }
      create_agent_meeting: {
        Args: {
          p_content: string
          p_key_hash: string
          p_meeting_date: string
          p_new_tickets?: Json
          p_payload_hash: string
          p_request_id: string
          p_status: string
          p_ticket_ids?: string[]
          p_title: string
        }
        Returns: Json
      }
      create_organization_team: {
        Args: {
          p_lead_gender?: string
          p_lead_name?: string
          p_lead_title?: string
          p_name: string
          p_parent_team_id?: string
        }
        Returns: Json
      }
      create_ticket: {
        Args: {
          p_assignee_id?: string
          p_description: string
          p_team_id?: string
          p_title: string
          p_type_id: string
        }
        Returns: Json
      }
      delete_organization_team: { Args: { p_team_id: string }; Returns: Json }
      delete_ticket: { Args: { p_ticket_number: string }; Returns: Json }
      mutate_agent_meeting: {
        Args: {
          p_key_hash: string
          p_meeting_id: string
          p_operation: string
          p_patch?: Json
          p_payload_hash: string
          p_request_id: string
        }
        Returns: Json
      }
      mutate_agent_ticket: {
        Args: {
          p_key_hash: string
          p_operation: string
          p_patch?: Json
          p_payload_hash: string
          p_request_id: string
          p_ticket_number?: string
        }
        Returns: Json
      }
      read_agent_api: {
        Args: {
          p_id?: string
          p_key_hash: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_resource: string
        }
        Returns: Json
      }
      save_meeting_note: {
        Args: {
          p_content: string
          p_meeting_date: string
          p_meeting_id?: string
          p_status: string
          p_ticket_ids?: string[]
          p_title: string
        }
        Returns: string
      }
      save_meeting_with_tickets: {
        Args: {
          p_content: string
          p_meeting_date: string
          p_meeting_id?: string
          p_new_tickets?: Json
          p_status: string
          p_ticket_ids?: string[]
          p_title: string
        }
        Returns: string
      }
      save_organization_team: {
        Args: {
          p_lead_member_id?: string
          p_members?: Json
          p_name: string
          p_team_id: string
        }
        Returns: Json
      }
      set_meeting_api_key_role: {
        Args: { p_key_id: string; p_role: string }
        Returns: Json
      }
      update_ticket: {
        Args: {
          p_assignee_id?: string
          p_description: string
          p_status: string
          p_team_id?: string
          p_ticket_number: string
          p_title: string
          p_type_id: string
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
