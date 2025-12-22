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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appreciations: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appreciations_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appreciations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          slots: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slots?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slots?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          connected_at: string
          id: string
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          connected_at?: string
          id?: string
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          connected_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_abandonment: {
        Row: {
          abandoned_at: string
          cart_items: Json
          cart_total: number | null
          currency: string | null
          email: string | null
          id: string
          recovered_at: string | null
          recovery_email_sent: boolean | null
          sequence_enrollment_id: string | null
          user_id: string | null
        }
        Insert: {
          abandoned_at?: string
          cart_items: Json
          cart_total?: number | null
          currency?: string | null
          email?: string | null
          id?: string
          recovered_at?: string | null
          recovery_email_sent?: boolean | null
          sequence_enrollment_id?: string | null
          user_id?: string | null
        }
        Update: {
          abandoned_at?: string
          cart_items?: Json
          cart_total?: number | null
          currency?: string | null
          email?: string | null
          id?: string
          recovered_at?: string | null
          recovery_email_sent?: boolean | null
          sequence_enrollment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_abandonment_sequence_enrollment_id_fkey"
            columns: ["sequence_enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          clauses: Json | null
          client_email: string | null
          client_name: string
          created_at: string
          custom_terms: string | null
          event_id: string | null
          id: string
          sent_at: string | null
          share_token: string | null
          signed_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clauses?: Json | null
          client_email?: string | null
          client_name: string
          created_at?: string
          custom_terms?: string | null
          event_id?: string | null
          id?: string
          sent_at?: string | null
          share_token?: string | null
          signed_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clauses?: Json | null
          client_email?: string | null
          client_name?: string
          created_at?: string
          custom_terms?: string | null
          event_id?: string | null
          id?: string
          sent_at?: string | null
          share_token?: string | null
          signed_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_ids: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      country_region_mapping: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
          region: Database["public"]["Enums"]["pricing_region"]
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          region: Database["public"]["Enums"]["pricing_region"]
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          region?: Database["public"]["Enums"]["pricing_region"]
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          created_at: string
          enrolled_at: string
          enrolled_by: string | null
          enrollment_type: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrolled_at?: string
          enrolled_by?: string | null
          enrollment_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrolled_at?: string
          enrolled_by?: string | null
          enrollment_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_group_courses: {
        Row: {
          course_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_group_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_group_courses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "course_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      course_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_landing_pages: {
        Row: {
          course_duration_minutes: number | null
          course_id: string | null
          course_image_url: string | null
          course_includes: string[] | null
          course_overview: string[] | null
          created_at: string
          cta_description: string | null
          cta_title: string | null
          expert_bio: string[] | null
          expert_image_url: string | null
          expert_name: string | null
          faqs: Json | null
          hero_background_url: string | null
          id: string
          instrument_tag: string | null
          learning_outcomes: Json | null
          learning_outcomes_intro: string | null
          overview_heading: string | null
          resources: Json | null
          styles_image_desktop: string | null
          styles_image_mobile: string | null
          trailer_video_url: string | null
          updated_at: string
        }
        Insert: {
          course_duration_minutes?: number | null
          course_id?: string | null
          course_image_url?: string | null
          course_includes?: string[] | null
          course_overview?: string[] | null
          created_at?: string
          cta_description?: string | null
          cta_title?: string | null
          expert_bio?: string[] | null
          expert_image_url?: string | null
          expert_name?: string | null
          faqs?: Json | null
          hero_background_url?: string | null
          id?: string
          instrument_tag?: string | null
          learning_outcomes?: Json | null
          learning_outcomes_intro?: string | null
          overview_heading?: string | null
          resources?: Json | null
          styles_image_desktop?: string | null
          styles_image_mobile?: string | null
          trailer_video_url?: string | null
          updated_at?: string
        }
        Update: {
          course_duration_minutes?: number | null
          course_id?: string | null
          course_image_url?: string | null
          course_includes?: string[] | null
          course_overview?: string[] | null
          created_at?: string
          cta_description?: string | null
          cta_title?: string | null
          expert_bio?: string[] | null
          expert_image_url?: string | null
          expert_name?: string | null
          faqs?: Json | null
          hero_background_url?: string | null
          id?: string
          instrument_tag?: string | null
          learning_outcomes?: Json | null
          learning_outcomes_intro?: string | null
          overview_heading?: string | null
          resources?: Json | null
          styles_image_desktop?: string | null
          styles_image_mobile?: string | null
          trailer_video_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_landing_pages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          color_theme: string | null
          course_id: string
          created_at: string
          description: string | null
          estimated_duration: number | null
          icon_type: string | null
          id: string
          order_index: number
          region_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color_theme?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          icon_type?: string | null
          id?: string
          order_index?: number
          region_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color_theme?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          icon_type?: string | null
          id?: string
          order_index?: number
          region_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          region_theme: Json | null
          title: string
          tutor_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          region_theme?: Json | null
          title: string
          tutor_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          region_theme?: Json | null
          title?: string
          tutor_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          exclude_tags: string[] | null
          id: string
          include_tags: string[] | null
          name: string
          scheduled_at: string | null
          send_to_lists: string[] | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          exclude_tags?: string[] | null
          id?: string
          include_tags?: string[] | null
          name: string
          scheduled_at?: string | null
          send_to_lists?: string[] | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          exclude_tags?: string[] | null
          id?: string
          include_tags?: string[] | null
          name?: string
          scheduled_at?: string | null
          send_to_lists?: string[] | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_contacts: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_subscribed: boolean
          last_name: string | null
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_subscribed?: boolean
          last_name?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_subscribed?: boolean
          last_name?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_list_members: {
        Row: {
          contact_id: string
          id: string
          joined_at: string
          list_id: string
        }
        Insert: {
          contact_id: string
          id?: string
          joined_at?: string
          list_id: string
        }
        Update: {
          contact_id?: string
          id?: string
          joined_at?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          event_id: string | null
          id: string
          recipient_email: string
          sent_at: string
          status: string | null
          subject: string
          template_type: string | null
          user_id: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          recipient_email: string
          sent_at?: string
          status?: string | null
          subject: string
          template_type?: string | null
          user_id: string
        }
        Update: {
          event_id?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string
          status?: string | null
          subject?: string
          template_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          clicked_at: string | null
          email: string
          enrollment_id: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string
          status: string
          step_id: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          email: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          step_id?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          email?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          step_id?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          current_step: number
          email: string
          enrolled_at: string
          id: string
          metadata: Json | null
          next_email_at: string | null
          sequence_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          current_step?: number
          email: string
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          next_email_at?: string | null
          sequence_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          current_step?: number
          email?: string
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          next_email_at?: string | null
          sequence_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          conditions: Json | null
          created_at: string
          delay_minutes: number
          id: string
          sequence_id: string
          step_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number
          id?: string
          sequence_id: string
          step_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number
          id?: string
          sequence_id?: string
          step_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_sequences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          template_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          arrival_time: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          end_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          fee: number | null
          id: string
          is_publicly_shared: boolean | null
          is_recurring: boolean | null
          notes: string | null
          payment_date: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          share_token: string | null
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          tags: string[] | null
          time_tbc: boolean | null
          title: string
          updated_at: string
          user_id: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          arrival_time?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          fee?: number | null
          id?: string
          is_publicly_shared?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          share_token?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[] | null
          time_tbc?: boolean | null
          title: string
          updated_at?: string
          user_id: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          arrival_time?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          fee?: number | null
          id?: string
          is_publicly_shared?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          share_token?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[] | null
          time_tbc?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          currency: string | null
          date: string
          deductible_percentage: number | null
          description: string
          event_id: string | null
          id: string
          is_tax_deductible: boolean | null
          notes: string | null
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency?: string | null
          date?: string
          deductible_percentage?: number | null
          description: string
          event_id?: string | null
          id?: string
          is_tax_deductible?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency?: string | null
          date?: string
          deductible_percentage?: number | null
          description?: string
          event_id?: string | null
          id?: string
          is_tax_deductible?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_type: string | null
          group_id: string
          id: string
          location: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          group_id: string
          id?: string
          location?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          group_id?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_polls: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          group_id: string
          id: string
          is_multiple_choice: boolean | null
          options: Json
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          group_id: string
          id?: string
          is_multiple_choice?: boolean | null
          options?: Json
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          group_id?: string
          id?: string
          is_multiple_choice?: boolean | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          is_announcement: boolean | null
          is_pinned: boolean | null
          media_type: string | null
          media_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          is_announcement?: boolean | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          is_announcement?: boolean | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category: Database["public"]["Enums"]["group_category"]
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string | null
          name: string
          privacy: Database["public"]["Enums"]["group_privacy"]
          rules: string | null
          settings: Json | null
          subcategory: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["group_category"]
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          privacy?: Database["public"]["Enums"]["group_privacy"]
          rules?: string | null
          settings?: Json | null
          subcategory?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["group_category"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          privacy?: Database["public"]["Enums"]["group_privacy"]
          rules?: string | null
          settings?: Json | null
          subcategory?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      income_proof_shares: {
        Row: {
          created_at: string
          id: string
          include_income_summary: boolean | null
          include_monthly_breakdown: boolean | null
          include_other_income: boolean | null
          include_tax_calculations: boolean | null
          share_token: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          include_income_summary?: boolean | null
          include_monthly_breakdown?: boolean | null
          include_other_income?: boolean | null
          include_tax_calculations?: boolean | null
          share_token?: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          include_income_summary?: boolean | null
          include_monthly_breakdown?: boolean | null
          include_other_income?: boolean | null
          include_tax_calculations?: boolean | null
          share_token?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_address: string | null
          client_email: string | null
          client_name: string
          created_at: string
          currency: string | null
          due_date: string | null
          event_id: string | null
          id: string
          invoice_number: string
          items: Json | null
          notes: string | null
          paid_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_address?: string | null
          client_email?: string | null
          client_name: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          invoice_number: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_bookings: {
        Row: {
          availability_id: string | null
          created_at: string
          currency: string | null
          duration_minutes: number
          id: string
          notes: string | null
          payment_status: string | null
          price: number | null
          scheduled_at: string
          status: string
          student_id: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          availability_id?: string | null
          created_at?: string
          currency?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          scheduled_at: string
          status?: string
          student_id: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          availability_id?: string | null
          created_at?: string
          currency?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          scheduled_at?: string
          status?: string
          student_id?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_bookings_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "tutor_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          student_id: string
          tutor_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          student_id: string
          tutor_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "lesson_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          folder: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          folder?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      module_lessons: {
        Row: {
          content: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          lesson_type: string
          listening_references: Json | null
          module_id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_type?: string
          listening_references?: Json | null
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_type?: string
          listening_references?: Json | null
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          from_user_id: string | null
          id: string
          is_read: boolean | null
          message: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      optin_form_submissions: {
        Row: {
          contact_id: string | null
          email: string
          form_data: Json | null
          form_id: string
          id: string
          ip_address: string | null
          submitted_at: string
          user_agent: string | null
        }
        Insert: {
          contact_id?: string | null
          email: string
          form_data?: Json | null
          form_id: string
          id?: string
          ip_address?: string | null
          submitted_at?: string
          user_agent?: string | null
        }
        Update: {
          contact_id?: string | null
          email?: string
          form_data?: Json | null
          form_id?: string
          id?: string
          ip_address?: string | null
          submitted_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optin_form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optin_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "optin_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      optin_forms: {
        Row: {
          button_text: string | null
          created_at: string
          description: string | null
          fields: Json | null
          heading: string | null
          id: string
          is_active: boolean
          name: string
          redirect_url: string | null
          sequence_id: string | null
          styling: Json | null
          success_message: string | null
          tags_to_assign: string[] | null
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          created_at?: string
          description?: string | null
          fields?: Json | null
          heading?: string | null
          id?: string
          is_active?: boolean
          name: string
          redirect_url?: string | null
          sequence_id?: string | null
          styling?: Json | null
          success_message?: string | null
          tags_to_assign?: string[] | null
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          created_at?: string
          description?: string | null
          fields?: Json | null
          heading?: string | null
          id?: string
          is_active?: boolean
          name?: string
          redirect_url?: string | null
          sequence_id?: string | null
          styling?: Json | null
          success_message?: string | null
          tags_to_assign?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "optin_forms_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      other_income: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string | null
          date: string
          description: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string | null
          date?: string
          description: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_audio: {
        Row: {
          artist: string | null
          audio_url: string
          cover_image_url: string | null
          created_at: string
          group_id: string | null
          id: string
          is_active: boolean | null
          section: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist?: string | null
          audio_url: string
          cover_image_url?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          section?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist?: string | null
          audio_url?: string
          cover_image_url?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          section?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_audio_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          media_type: string | null
          post_type: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          media_type?: string | null
          post_type?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          media_type?: string | null
          post_type?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      product_regional_pricing: {
        Row: {
          created_at: string
          currency: string
          discount_percentage: number
          id: string
          product_id: string
          region: Database["public"]["Enums"]["pricing_region"]
        }
        Insert: {
          created_at?: string
          currency?: string
          discount_percentage?: number
          id?: string
          product_id: string
          region: Database["public"]["Enums"]["pricing_region"]
        }
        Update: {
          created_at?: string
          currency?: string
          discount_percentage?: number
          id?: string
          product_id?: string
          region?: Database["public"]["Enums"]["pricing_region"]
        }
        Relationships: [
          {
            foreignKeyName: "product_regional_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price_usd: number
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product_type: string
          purchase_tag_id: string | null
          refund_remove_tag: boolean | null
          sale_ends_at: string | null
          sale_price_usd: number | null
          tutor_id: string | null
          updated_at: string
        }
        Insert: {
          base_price_usd?: number
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_type?: string
          purchase_tag_id?: string | null
          refund_remove_tag?: boolean | null
          sale_ends_at?: string | null
          sale_price_usd?: number | null
          tutor_id?: string | null
          updated_at?: string
        }
        Update: {
          base_price_usd?: number
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_type?: string
          purchase_tag_id?: string | null
          refund_remove_tag?: boolean | null
          sale_ends_at?: string | null
          sale_price_usd?: number | null
          tutor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_purchase_tag_id_fkey"
            columns: ["purchase_tag_id"]
            isOneToOne: false
            referencedRelation: "email_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          order_index: number
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          order_index?: number
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          order_index?: number
          user_id?: string
        }
        Relationships: []
      }
      profile_projects: {
        Row: {
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          order_index: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          order_index?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          order_index?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_sections: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_visible: boolean | null
          order_index: number
          section_type: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number
          section_type: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number
          section_type?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_tabs: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_visible: boolean | null
          order_index: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_details: string | null
          bio: string | null
          business_name: string | null
          cover_image_url: string | null
          created_at: string
          default_currency: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_public: boolean | null
          last_name: string | null
          logo_url: string | null
          message_privacy: string | null
          paypal_email: string | null
          phone: string | null
          profile_layout: Json | null
          profile_type: string | null
          social_links: Json | null
          tagline: string | null
          tax_country: string | null
          tax_id: string | null
          tip_jar_enabled: boolean | null
          updated_at: string
          username: string | null
          vat_number: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_details?: string | null
          bio?: string | null
          business_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_public?: boolean | null
          last_name?: string | null
          logo_url?: string | null
          message_privacy?: string | null
          paypal_email?: string | null
          phone?: string | null
          profile_layout?: Json | null
          profile_type?: string | null
          social_links?: Json | null
          tagline?: string | null
          tax_country?: string | null
          tax_id?: string | null
          tip_jar_enabled?: boolean | null
          updated_at?: string
          username?: string | null
          vat_number?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_details?: string | null
          bio?: string | null
          business_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_public?: boolean | null
          last_name?: string | null
          logo_url?: string | null
          message_privacy?: string | null
          paypal_email?: string | null
          phone?: string | null
          profile_layout?: Json | null
          profile_type?: string | null
          social_links?: Json | null
          tagline?: string | null
          tax_country?: string | null
          tax_id?: string | null
          tip_jar_enabled?: boolean | null
          updated_at?: string
          username?: string | null
          vat_number?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      shared_events: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          can_see_fee: boolean | null
          created_at: string
          custom_fee: number | null
          event_id: string
          id: string
          shared_by: string
          shared_with: string | null
          shared_with_email: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          can_see_fee?: boolean | null
          created_at?: string
          custom_fee?: number | null
          event_id: string
          id?: string
          shared_by: string
          shared_with?: string | null
          shared_with_email?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          can_see_fee?: boolean | null
          created_at?: string
          custom_fee?: number | null
          event_id?: string
          id?: string
          shared_by?: string
          shared_with?: string | null
          shared_with_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_plot_items: {
        Row: {
          channel_number: number | null
          created_at: string
          fx_sends: string[] | null
          icon_type: string
          id: string
          insert_required: boolean | null
          label: string | null
          mic_type: string | null
          monitor_mixes: string[] | null
          notes: string | null
          paired_with_id: string | null
          phantom_power: boolean | null
          position_x: number
          position_y: number
          provided_by: string | null
          rotation: number | null
          tech_spec_id: string
          updated_at: string
        }
        Insert: {
          channel_number?: number | null
          created_at?: string
          fx_sends?: string[] | null
          icon_type: string
          id?: string
          insert_required?: boolean | null
          label?: string | null
          mic_type?: string | null
          monitor_mixes?: string[] | null
          notes?: string | null
          paired_with_id?: string | null
          phantom_power?: boolean | null
          position_x?: number
          position_y?: number
          provided_by?: string | null
          rotation?: number | null
          tech_spec_id: string
          updated_at?: string
        }
        Update: {
          channel_number?: number | null
          created_at?: string
          fx_sends?: string[] | null
          icon_type?: string
          id?: string
          insert_required?: boolean | null
          label?: string | null
          mic_type?: string | null
          monitor_mixes?: string[] | null
          notes?: string | null
          paired_with_id?: string | null
          phantom_power?: boolean | null
          position_x?: number
          position_y?: number
          provided_by?: string | null
          rotation?: number | null
          tech_spec_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_plot_items_paired_with_id_fkey"
            columns: ["paired_with_id"]
            isOneToOne: false
            referencedRelation: "stage_plot_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_plot_items_tech_spec_id_fkey"
            columns: ["tech_spec_id"]
            isOneToOne: false
            referencedRelation: "tech_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_specs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_publicly_shared: boolean | null
          name: string
          share_token: string | null
          stage_depth: number | null
          stage_width: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_publicly_shared?: boolean | null
          name: string
          share_token?: string | null
          stage_depth?: number | null
          stage_width?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_publicly_shared?: boolean | null
          name?: string
          share_token?: string | null
          stage_depth?: number | null
          stage_width?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_availability: {
        Row: {
          available_at: string
          booking_token: string | null
          created_at: string
          duration_minutes: number
          id: string
          is_booked: boolean | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          available_at: string
          booking_token?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_booked?: boolean | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          available_at?: string
          booking_token?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_booked?: boolean | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_course_stats: {
        Row: {
          badges: Json | null
          course_id: string
          created_at: string
          id: string
          last_activity_date: string | null
          streak_days: number | null
          updated_at: string
          user_id: string
          xp: number | null
        }
        Insert: {
          badges?: Json | null
          course_id: string
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak_days?: number | null
          updated_at?: string
          user_id: string
          xp?: number | null
        }
        Update: {
          badges?: Json | null
          course_id?: string
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak_days?: number | null
          updated_at?: string
          user_id?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_course_stats_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          notes: string | null
          updated_at: string
          user_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          notes?: string | null
          updated_at?: string
          user_id: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "module_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_practice_scores: {
        Row: {
          course_id: string | null
          created_at: string
          difficulty: string | null
          id: string
          max_score: number
          metadata: Json | null
          practice_type: string
          score: number
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          max_score: number
          metadata?: Json | null
          practice_type: string
          score: number
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          max_score?: number
          metadata?: Json | null
          practice_type?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_practice_scores_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tags: {
        Row: {
          assigned_at: string
          email: string | null
          id: string
          source: string
          source_id: string | null
          tag_id: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string
          email?: string | null
          id?: string
          source?: string
          source_id?: string | null
          tag_id: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string
          email?: string | null
          id?: string
          source?: string
          source_id?: string | null
          tag_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "email_tags"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      calculate_regional_price: {
        Args: {
          p_base_price_usd: number
          p_region: Database["public"]["Enums"]["pricing_region"]
        }
        Returns: {
          currency: string
          discount_percentage: number
          price: number
        }[]
      }
      email_owns_course: {
        Args: { p_course_id: string; p_email: string }
        Returns: boolean
      }
      generate_invoice_number: { Args: { _user_id: string }; Returns: string }
      get_income_proof_by_token: {
        Args: { p_token: string }
        Returns: {
          include_income_summary: boolean
          include_monthly_breakdown: boolean
          include_other_income: boolean
          include_tax_calculations: boolean
          owner_user_id: string
          share_id: string
        }[]
      }
      get_public_profile: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          bio: string
          business_name: string
          cover_image_url: string
          full_name: string
          id: string
          paypal_email: string
          profile_type: string
          social_links: Json
          tagline: string
          tip_jar_enabled: boolean
          username: string
          website_url: string
        }[]
      }
      get_shared_contract: {
        Args: { p_share_token: string }
        Returns: {
          client_name: string
          created_at: string
          id: string
          signed_at: string
          title: string
        }[]
      }
      get_shared_financial_data: {
        Args: { p_user_id: string }
        Returns: {
          business_name: string
          full_name: string
          monthly_data: Json
          total_event_income: number
          total_other_income: number
        }[]
      }
      get_shared_tech_spec: {
        Args: { p_share_token: string }
        Returns: {
          description: string
          id: string
          name: string
          owner_business: string
          owner_name: string
          stage_depth: number
          stage_width: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_admin: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      user_owns_course: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
      event_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "pencilled"
      event_type:
        | "gig"
        | "session"
        | "lesson"
        | "rehearsal"
        | "meeting"
        | "other"
      expense_category:
        | "travel"
        | "equipment"
        | "food"
        | "accommodation"
        | "marketing"
        | "software"
        | "other"
      group_category:
        | "genre"
        | "instrument"
        | "collaboration"
        | "learning"
        | "networking"
        | "local"
        | "production"
        | "other"
      group_member_role: "admin" | "moderator" | "member"
      group_privacy: "public" | "private" | "secret"
      payment_status: "unpaid" | "paid" | "partial" | "overdue"
      pricing_region:
        | "africa"
        | "south_america"
        | "usa_canada"
        | "uk"
        | "north_west_europe"
        | "east_south_europe"
        | "asia_lower"
        | "asia_higher"
        | "default"
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
      app_role: ["admin", "user", "staff"],
      event_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "pencilled",
      ],
      event_type: ["gig", "session", "lesson", "rehearsal", "meeting", "other"],
      expense_category: [
        "travel",
        "equipment",
        "food",
        "accommodation",
        "marketing",
        "software",
        "other",
      ],
      group_category: [
        "genre",
        "instrument",
        "collaboration",
        "learning",
        "networking",
        "local",
        "production",
        "other",
      ],
      group_member_role: ["admin", "moderator", "member"],
      group_privacy: ["public", "private", "secret"],
      payment_status: ["unpaid", "paid", "partial", "overdue"],
      pricing_region: [
        "africa",
        "south_america",
        "usa_canada",
        "uk",
        "north_west_europe",
        "east_south_europe",
        "asia_lower",
        "asia_higher",
        "default",
      ],
    },
  },
} as const
