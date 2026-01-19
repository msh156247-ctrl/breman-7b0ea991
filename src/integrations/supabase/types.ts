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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean | null
          content: string | null
          created_at: string | null
          id: string
          priority: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          content?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          content?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          title?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          created_at: string | null
          escrow_status: Database["public"]["Enums"]["escrow_status"] | null
          fee_rate: number | null
          id: string
          project_id: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          team_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"] | null
          fee_rate?: number | null
          id?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          team_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"] | null
          fee_rate?: number | null
          id?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          team_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          name: string | null
          team_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          name?: string | null
          team_id?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          name?: string | null
          team_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_note: string | null
          contract_id: string | null
          created_at: string | null
          details: string | null
          evidence_files: string[] | null
          id: string
          milestone_id: string | null
          opened_by: string | null
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["dispute_status"] | null
        }
        Insert: {
          admin_note?: string | null
          contract_id?: string | null
          created_at?: string | null
          details?: string | null
          evidence_files?: string[] | null
          id?: string
          milestone_id?: string | null
          opened_by?: string | null
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
        }
        Update: {
          admin_note?: string | null
          contract_id?: string | null
          created_at?: string | null
          details?: string | null
          evidence_files?: string[] | null
          id?: string
          milestone_id?: string | null
          opened_by?: string | null
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_branding: {
        Row: {
          accent_color: string
          background_color: string
          brand_name: string
          created_at: string
          footer_text: string | null
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          support_email: string | null
          text_color: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string
          background_color?: string
          brand_name?: string
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          support_email?: string | null
          text_color?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string
          background_color?: string
          brand_name?: string
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          support_email?: string | null
          text_color?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: string[] | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_pinned: boolean | null
          reply_to_id: string | null
          sender_id: string
          sender_team_id: string | null
          updated_at: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          reply_to_id?: string | null
          sender_id: string
          sender_team_id?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
          sender_team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_team_id_fkey"
            columns: ["sender_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_submissions: {
        Row: {
          files: string[] | null
          id: string
          milestone_id: string | null
          note: string | null
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          files?: string[] | null
          id?: string
          milestone_id?: string | null
          note?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          files?: string[] | null
          id?: string
          milestone_id?: string | null
          note?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_submissions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          amount: number | null
          contract_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          order_index: number | null
          status: Database["public"]["Enums"]["milestone_status"] | null
        }
        Insert: {
          amount?: number | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          order_index?: number | null
          status?: Database["public"]["Enums"]["milestone_status"] | null
        }
        Update: {
          amount?: number | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          order_index?: number | null
          status?: Database["public"]["Enums"]["milestone_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_day: number | null
          digest_mode: string | null
          digest_time: string | null
          email_badge: boolean
          email_contract: boolean
          email_dispute: boolean
          email_payment: boolean
          email_project: boolean
          email_review: boolean
          email_siege: boolean
          email_system: boolean
          email_team: boolean
          id: string
          last_digest_sent_at: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_day?: number | null
          digest_mode?: string | null
          digest_time?: string | null
          email_badge?: boolean
          email_contract?: boolean
          email_dispute?: boolean
          email_payment?: boolean
          email_project?: boolean
          email_review?: boolean
          email_siege?: boolean
          email_system?: boolean
          email_team?: boolean
          id?: string
          last_digest_sent_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_day?: number | null
          digest_mode?: string | null
          digest_time?: string | null
          email_badge?: boolean
          email_contract?: boolean
          email_dispute?: boolean
          email_payment?: boolean
          email_project?: boolean
          email_review?: boolean
          email_siege?: boolean
          email_system?: boolean
          email_team?: boolean
          id?: string
          last_digest_sent_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_digest_notifications: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_digest_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_digest_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_digest_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          animal_skin: Database["public"]["Enums"]["animal_skin"] | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          id: string
          level: number | null
          main_role_type: Database["public"]["Enums"]["role_type"] | null
          name: string
          primary_role: Database["public"]["Enums"]["user_role"] | null
          rating_avg: number | null
          sub_role_types: Database["public"]["Enums"]["role_type"][] | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          verified: boolean | null
          xp: number | null
        }
        Insert: {
          animal_skin?: Database["public"]["Enums"]["animal_skin"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          id: string
          level?: number | null
          main_role_type?: Database["public"]["Enums"]["role_type"] | null
          name: string
          primary_role?: Database["public"]["Enums"]["user_role"] | null
          rating_avg?: number | null
          sub_role_types?: Database["public"]["Enums"]["role_type"][] | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verified?: boolean | null
          xp?: number | null
        }
        Update: {
          animal_skin?: Database["public"]["Enums"]["animal_skin"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          id?: string
          level?: number | null
          main_role_type?: Database["public"]["Enums"]["role_type"] | null
          name?: string
          primary_role?: Database["public"]["Enums"]["user_role"] | null
          rating_avg?: number | null
          sub_role_types?: Database["public"]["Enums"]["role_type"][] | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verified?: boolean | null
          xp?: number | null
        }
        Relationships: []
      }
      project_proposals: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          id: string
          project_id: string | null
          proposal_text: string | null
          proposed_budget: number | null
          proposed_timeline_weeks: number | null
          status: Database["public"]["Enums"]["proposal_status"] | null
          team_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          proposal_text?: string | null
          proposed_budget?: number | null
          proposed_timeline_weeks?: number | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          team_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          proposal_text?: string | null
          proposed_budget?: number | null
          proposed_timeline_weeks?: number | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          client_id: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          required_roles: Database["public"]["Enums"]["user_role"][] | null
          required_skills: string[] | null
          status: Database["public"]["Enums"]["project_status"] | null
          timeline_weeks: number | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          client_id?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          required_roles?: Database["public"]["Enums"]["user_role"][] | null
          required_skills?: string[] | null
          status?: Database["public"]["Enums"]["project_status"] | null
          timeline_weeks?: number | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          client_id?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          required_roles?: Database["public"]["Enums"]["user_role"][] | null
          required_skills?: string[] | null
          status?: Database["public"]["Enums"]["project_status"] | null
          timeline_weeks?: number | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedule_settings: {
        Row: {
          created_at: string
          delivery_hour: number
          delivery_minute: number
          frequency: string
          id: string
          is_enabled: boolean
          monthly_day: number | null
          timezone: string
          updated_at: string
          weekly_day: number | null
        }
        Insert: {
          created_at?: string
          delivery_hour?: number
          delivery_minute?: number
          frequency?: string
          id?: string
          is_enabled?: boolean
          monthly_day?: number | null
          timezone?: string
          updated_at?: string
          weekly_day?: number | null
        }
        Update: {
          created_at?: string
          delivery_hour?: number
          delivery_minute?: number
          frequency?: string
          id?: string
          is_enabled?: boolean
          monthly_day?: number | null
          timezone?: string
          updated_at?: string
          weekly_day?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          from_user_id: string | null
          id: string
          project_id: string | null
          rating: number | null
          to_team_id: string | null
          to_user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
          to_team_id?: string | null
          to_user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
          to_team_id?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      siege_registrations: {
        Row: {
          alias: string | null
          id: string
          registered_at: string | null
          siege_id: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          alias?: string | null
          id?: string
          registered_at?: string | null
          siege_id?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          alias?: string | null
          id?: string
          registered_at?: string | null
          siege_id?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siege_registrations_siege_id_fkey"
            columns: ["siege_id"]
            isOneToOne: false
            referencedRelation: "sieges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siege_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      siege_submissions: {
        Row: {
          id: string
          kind: Database["public"]["Enums"]["submission_kind"] | null
          score: number | null
          siege_id: string | null
          submitted_at: string | null
          team_id: string | null
        }
        Insert: {
          id?: string
          kind?: Database["public"]["Enums"]["submission_kind"] | null
          score?: number | null
          siege_id?: string | null
          submitted_at?: string | null
          team_id?: string | null
        }
        Update: {
          id?: string
          kind?: Database["public"]["Enums"]["submission_kind"] | null
          score?: number | null
          siege_id?: string | null
          submitted_at?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siege_submissions_siege_id_fkey"
            columns: ["siege_id"]
            isOneToOne: false
            referencedRelation: "sieges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siege_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sieges: {
        Row: {
          created_at: string | null
          description: string | null
          end_at: string | null
          id: string
          max_teams: number | null
          prizes_json: Json | null
          rules: string | null
          sponsors: string[] | null
          start_at: string | null
          status: Database["public"]["Enums"]["siege_status"] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          max_teams?: number | null
          prizes_json?: Json | null
          rules?: string | null
          sponsors?: string[] | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["siege_status"] | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          max_teams?: number | null
          prizes_json?: Json | null
          rules?: string | null
          sponsors?: string[] | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["siege_status"] | null
          title?: string
        }
        Relationships: []
      }
      skill_experiences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          skill_id: string | null
          title: string
          user_id: string | null
          xp_earned: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          skill_id?: string | null
          title: string
          user_id?: string | null
          xp_earned?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          skill_id?: string | null
          title?: string
          user_id?: string | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_experiences_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_applications: {
        Row: {
          answers_json: Json | null
          attachments: string[] | null
          created_at: string | null
          desired_role: Database["public"]["Enums"]["user_role"]
          id: string
          intro: string | null
          role_type: Database["public"]["Enums"]["role_type"] | null
          status: Database["public"]["Enums"]["application_status"] | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          answers_json?: Json | null
          attachments?: string[] | null
          created_at?: string | null
          desired_role: Database["public"]["Enums"]["user_role"]
          id?: string
          intro?: string | null
          role_type?: Database["public"]["Enums"]["role_type"] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          answers_json?: Json | null
          attachments?: string[] | null
          created_at?: string | null
          desired_role?: Database["public"]["Enums"]["user_role"]
          id?: string
          intro?: string | null
          role_type?: Database["public"]["Enums"]["role_type"] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_applications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          reply_to_id: string | null
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          reply_to_id?: string | null
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          reply_to_id?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_role_slots: {
        Row: {
          created_at: string | null
          current_count: number
          id: string
          is_open: boolean | null
          max_count: number
          min_level: number | null
          required_skill_levels: Json | null
          required_skills: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          role_type: Database["public"]["Enums"]["role_type"] | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_count?: number
          id?: string
          is_open?: boolean | null
          max_count?: number
          min_level?: number | null
          required_skill_levels?: Json | null
          required_skills?: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          role_type?: Database["public"]["Enums"]["role_type"] | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_count?: number
          id?: string
          is_open?: boolean | null
          max_count?: number
          min_level?: number | null
          required_skill_levels?: Json | null
          required_skills?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          role_type?: Database["public"]["Enums"]["role_type"] | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_role_slots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avg_level: number | null
          created_at: string | null
          description: string | null
          emblem_url: string | null
          id: string
          leader_id: string | null
          name: string
          rating_avg: number | null
          recruitment_method:
            | Database["public"]["Enums"]["recruitment_method"]
            | null
          slogan: string | null
          status: Database["public"]["Enums"]["team_status"] | null
          updated_at: string | null
        }
        Insert: {
          avg_level?: number | null
          created_at?: string | null
          description?: string | null
          emblem_url?: string | null
          id?: string
          leader_id?: string | null
          name: string
          rating_avg?: number | null
          recruitment_method?:
            | Database["public"]["Enums"]["recruitment_method"]
            | null
          slogan?: string | null
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
        }
        Update: {
          avg_level?: number | null
          created_at?: string | null
          description?: string | null
          emblem_url?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          rating_avg?: number | null
          recruitment_method?:
            | Database["public"]["Enums"]["recruitment_method"]
            | null
          slogan?: string | null
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          id: string
          level: number | null
          points: number | null
          skill_id: string | null
          tier: Database["public"]["Enums"]["skill_tier"] | null
          user_id: string | null
        }
        Insert: {
          id?: string
          level?: number | null
          points?: number | null
          skill_id?: string | null
          tier?: Database["public"]["Enums"]["skill_tier"] | null
          user_id?: string | null
        }
        Update: {
          id?: string
          level?: number | null
          points?: number | null
          skill_id?: string | null
          tier?: Database["public"]["Enums"]["skill_tier"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string | null
          level: number | null
          name: string | null
          primary_role: Database["public"]["Enums"]["user_role"] | null
          rating_avg: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          verified: boolean | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          level?: number | null
          name?: string | null
          primary_role?: Database["public"]["Enums"]["user_role"] | null
          rating_avg?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verified?: boolean | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          level?: number | null
          name?: string | null
          primary_role?: Database["public"]["Enums"]["user_role"] | null
          rating_avg?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verified?: boolean | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      animal_skin: "horse" | "dog" | "cat" | "rooster"
      app_role: "admin" | "moderator" | "user"
      application_status: "pending" | "accepted" | "rejected" | "withdrawn"
      contract_status:
        | "draft"
        | "active"
        | "completed"
        | "disputed"
        | "cancelled"
      conversation_type: "direct" | "team" | "team_to_team"
      dispute_status: "open" | "investigating" | "resolved" | "closed"
      escrow_status:
        | "not_funded"
        | "funded"
        | "on_hold"
        | "released"
        | "refunded"
      milestone_status:
        | "pending"
        | "in_progress"
        | "review"
        | "approved"
        | "rejected"
        | "dispute"
      notification_type:
        | "team_invite"
        | "application"
        | "project_match"
        | "milestone"
        | "siege"
        | "system"
      project_status:
        | "open"
        | "matched"
        | "in_progress"
        | "completed"
        | "cancelled"
      proposal_status: "pending" | "accepted" | "rejected" | "withdrawn"
      recruitment_method: "public" | "invite" | "auto"
      role_type:
        | "backend"
        | "frontend"
        | "design"
        | "pm"
        | "data"
        | "qa"
        | "devops"
        | "marketing"
        | "mobile"
        | "security"
      siege_status: "registering" | "ongoing" | "ended" | "results"
      skill_tier: "bronze" | "silver" | "gold" | "platinum" | "diamond"
      submission_kind: "test" | "final"
      team_status: "active" | "inactive" | "recruiting"
      user_role: "horse" | "dog" | "cat" | "rooster"
      user_type: "individual" | "team_leader" | "client" | "admin"
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
    Enums: {
      animal_skin: ["horse", "dog", "cat", "rooster"],
      app_role: ["admin", "moderator", "user"],
      application_status: ["pending", "accepted", "rejected", "withdrawn"],
      contract_status: [
        "draft",
        "active",
        "completed",
        "disputed",
        "cancelled",
      ],
      conversation_type: ["direct", "team", "team_to_team"],
      dispute_status: ["open", "investigating", "resolved", "closed"],
      escrow_status: [
        "not_funded",
        "funded",
        "on_hold",
        "released",
        "refunded",
      ],
      milestone_status: [
        "pending",
        "in_progress",
        "review",
        "approved",
        "rejected",
        "dispute",
      ],
      notification_type: [
        "team_invite",
        "application",
        "project_match",
        "milestone",
        "siege",
        "system",
      ],
      project_status: [
        "open",
        "matched",
        "in_progress",
        "completed",
        "cancelled",
      ],
      proposal_status: ["pending", "accepted", "rejected", "withdrawn"],
      recruitment_method: ["public", "invite", "auto"],
      role_type: [
        "backend",
        "frontend",
        "design",
        "pm",
        "data",
        "qa",
        "devops",
        "marketing",
        "mobile",
        "security",
      ],
      siege_status: ["registering", "ongoing", "ended", "results"],
      skill_tier: ["bronze", "silver", "gold", "platinum", "diamond"],
      submission_kind: ["test", "final"],
      team_status: ["active", "inactive", "recruiting"],
      user_role: ["horse", "dog", "cat", "rooster"],
      user_type: ["individual", "team_leader", "client", "admin"],
    },
  },
} as const
