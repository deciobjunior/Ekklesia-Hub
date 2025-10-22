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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          adults_count: number | null
          church_id: string | null
          created_at: string
          id: string
          kids_count: number | null
          service_date: string
          service_type: string | null
          visitors_count: number | null
        }
        Insert: {
          adults_count?: number | null
          church_id?: string | null
          created_at?: string
          id?: string
          kids_count?: number | null
          service_date: string
          service_type?: string | null
          visitors_count?: number | null
        }
        Update: {
          adults_count?: number | null
          church_id?: string | null
          created_at?: string
          id?: string
          kids_count?: number | null
          service_date?: string
          service_type?: string | null
          visitors_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          id: string
          name: string | null
          owner_id: string | null
          phone: string | null
          senior_pastor_email: string | null
          senior_pastor_name: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          senior_pastor_email?: string | null
          senior_pastor_name?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          senior_pastor_email?: string | null
          senior_pastor_name?: string | null
        }
        Relationships: []
      }
      communication_group_members: {
        Row: {
          added_at: string | null
          contact_id: string | null
          group_id: string
          id: string
          is_active: boolean | null
          member_id: string | null
          name: string
          phone: string
        }
        Insert: {
          added_at?: string | null
          contact_id?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          member_id?: string | null
          name: string
          phone: string
        }
        Update: {
          added_at?: string | null
          contact_id?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          member_id?: string | null
          name?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          campaign_id: string | null
          church_id: string | null
          contact_name: string | null
          direction: string | null
          id: string
          is_read: boolean | null
          message: string | null
          message_type: string | null
          phone: string | null
          sent_at: string | null
          status: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          church_id?: string | null
          contact_name?: string | null
          direction?: string | null
          id: string
          is_read?: boolean | null
          message?: string | null
          message_type?: string | null
          phone?: string | null
          sent_at?: string | null
          status?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          church_id?: string | null
          contact_name?: string | null
          direction?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          message_type?: string | null
          phone?: string | null
          sent_at?: string | null
          status?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      counselors: {
        Row: {
          availability: Json | null
          birthdate: string | null
          church_id: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          id: string
          marital_status: string | null
          name: string
          phone: string | null
          topics: string[] | null
        }
        Insert: {
          availability?: Json | null
          birthdate?: string | null
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name: string
          phone?: string | null
          topics?: string[] | null
        }
        Update: {
          availability?: Json | null
          birthdate?: string | null
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name?: string
          phone?: string | null
          topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "counselors_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          church_id: string | null
          created_at: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_messages: {
        Row: {
          church_id: string
          contact_name: string | null
          id: number
          is_read: boolean | null
          message: string | null
          message_timestamp: string | null
          phone: string
          wa_message_id: string | null
        }
        Insert: {
          church_id: string
          contact_name?: string | null
          id?: never
          is_read?: boolean | null
          message?: string | null
          message_timestamp?: string | null
          phone: string
          wa_message_id?: string | null
        }
        Update: {
          church_id?: string
          contact_name?: string | null
          id?: never
          is_read?: boolean | null
          message?: string | null
          message_timestamp?: string | null
          phone?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_messages_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          avatar: string | null
          birthdate: string | null
          church_id: string | null
          cpf: string | null
          created_at: string
          doubts: string | null
          email: string | null
          father_name: string | null
          gender: string | null
          id: string
          is_baptized: boolean | null
          lastseen: string | null
          marital_status: string | null
          maritalstatus: string | null
          mother_name: string | null
          name: string
          origin_church: string | null
          phone: string | null
          profession: string | null
          rg: string | null
          role: string | null
          status: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar?: string | null
          birthdate?: string | null
          church_id?: string | null
          cpf?: string | null
          created_at?: string
          doubts?: string | null
          email?: string | null
          father_name?: string | null
          gender?: string | null
          id?: string
          is_baptized?: boolean | null
          lastseen?: string | null
          marital_status?: string | null
          maritalstatus?: string | null
          mother_name?: string | null
          name: string
          origin_church?: string | null
          phone?: string | null
          profession?: string | null
          rg?: string | null
          role?: string | null
          status?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar?: string | null
          birthdate?: string | null
          church_id?: string | null
          cpf?: string | null
          created_at?: string
          doubts?: string | null
          email?: string | null
          father_name?: string | null
          gender?: string | null
          id?: string
          is_baptized?: boolean | null
          lastseen?: string | null
          marital_status?: string | null
          maritalstatus?: string | null
          mother_name?: string | null
          name?: string
          origin_church?: string | null
          phone?: string | null
          profession?: string | null
          rg?: string | null
          role?: string | null
          status?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      message_history: {
        Row: {
          campaign_id: string | null
          church_id: string
          created_at: string | null
          id: number
          member_name: string | null
          member_phone: string
          message_body: string | null
          sent_by: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          church_id: string
          created_at?: string | null
          id?: never
          member_name?: string | null
          member_phone: string
          message_body?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          church_id?: string
          created_at?: string | null
          id?: never
          member_name?: string | null
          member_phone?: string
          message_body?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_history_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string | null
          church_id: string | null
          created_at: string | null
          id: string
          is_template: boolean | null
          name: string | null
          provider: string | null
        }
        Insert: {
          body?: string | null
          church_id?: string | null
          created_at?: string | null
          id?: string
          is_template?: boolean | null
          name?: string | null
          provider?: string | null
        }
        Update: {
          body?: string | null
          church_id?: string | null
          created_at?: string | null
          id?: string
          is_template?: boolean | null
          name?: string | null
          provider?: string | null
        }
        Relationships: []
      }
      new_beginnings: {
        Row: {
          activities: Json | null
          church_id: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          follow_ups: Json | null
          follower_id: Json | null
          follower_name: Json | null
          forwarded_to_counseling: boolean | null
          id: string
          interests: Json | null
          name: string
          phone: string | null
          request_details: string | null
          status: string | null
        }
        Insert: {
          activities?: Json | null
          church_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          follow_ups?: Json | null
          follower_id?: Json | null
          follower_name?: Json | null
          forwarded_to_counseling?: boolean | null
          id?: string
          interests?: Json | null
          name: string
          phone?: string | null
          request_details?: string | null
          status?: string | null
        }
        Update: {
          activities?: Json | null
          church_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          follow_ups?: Json | null
          follower_id?: Json | null
          follower_name?: Json | null
          forwarded_to_counseling?: boolean | null
          id?: string
          interests?: Json | null
          name?: string
          phone?: string | null
          request_details?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_beginnings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      pastors_and_leaders: {
        Row: {
          church_id: string | null
          created_at: string | null
          email: string
          form_data: Json | null
          id: string
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          email: string
          form_data?: Json | null
          id?: string
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          email?: string
          form_data?: Json | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastors_and_leaders_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          church_id: string | null
          created_at: string | null
          email: string | null
          form_data: Json | null
          id: string
          name: string
          phone: string | null
          role: string
          status: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          form_data?: Json | null
          id?: string
          name: string
          phone?: string | null
          role: string
          status?: string
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          form_data?: Json | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_registrations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permissions: Json
          role: string
        }
        Insert: {
          permissions: Json
          role: string
        }
        Update: {
          permissions?: Json
          role?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      small_groups: {
        Row: {
          church_id: string | null
          created_at: string
          id: string
          image_url: string | null
          leader_id: string | null
          location: string | null
          member_ids: string[] | null
          name: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          leader_id?: string | null
          location?: string | null
          member_ids?: string[] | null
          name: string
        }
        Update: {
          church_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          leader_id?: string | null
          location?: string | null
          member_ids?: string[] | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "small_groups_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "pastors_and_leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          church_id: string | null
          created_at: string | null
          email: string | null
          how_met_church: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          how_met_church?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          how_met_church?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_schedules: {
        Row: {
          church_id: string
          created_at: string
          id: string
          ministry_id: string
          ministry_name: string
          month: string
          schedule_data: Json
          updated_at: string
        }
        Insert: {
          church_id: string
          created_at?: string
          id?: string
          ministry_id: string
          ministry_name: string
          month: string
          schedule_data: Json
          updated_at?: string
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          ministry_id?: string
          ministry_name?: string
          month?: string
          schedule_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_schedules_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          availability: Json | null
          church_id: string | null
          created_at: string | null
          email: string | null
          id: string
          ministries: string[] | null
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          availability?: Json | null
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ministries?: string[] | null
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          availability?: Json | null
          church_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ministries?: string[] | null
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role: {
        Args: { p_member_id: string; p_role_id: string }
        Returns: undefined
      }
      get_conversation_messages: {
        Args: { p_church_id: string; p_phone: string }
        Returns: {
          contact_name: string
          direction: string
          id: string
          message: string
          message_timestamp: string
          phone: string
        }[]
      }
      get_paginated_members: {
        Args: {
          p_church_id: string
          p_page_number: number
          p_page_size: number
        }
        Returns: {
          birthdate: string
          created_at: string
          email: string
          gender: string
          id: string
          name: string
          phone: string
          role: string
          status: string
        }[]
      }
      get_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          id: string
          name: string
        }[]
      }
      update_application_status_and_docs: {
        Args: {
          p_application_id: string
          p_new_form_data: Json
          p_new_status: string
        }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const
