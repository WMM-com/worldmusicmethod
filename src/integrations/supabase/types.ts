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
      account_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmed_at: string | null
          email: string
          expires_at: string | null
          id: string
          requested_at: string | null
          status: string | null
          token: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          confirmed_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          token?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          confirmed_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          token?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
          media_type: string | null
          media_url: string | null
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
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
      coupons: {
        Row: {
          amount_off: number | null
          applies_to_one_time: boolean | null
          applies_to_products: string[] | null
          applies_to_subscriptions: boolean | null
          code: string
          created_at: string
          currency: string | null
          description: string | null
          discount_type: string
          duration: string
          duration_in_months: number | null
          id: string
          is_active: boolean | null
          max_redemptions: number | null
          name: string | null
          percent_off: number | null
          stripe_coupon_id: string | null
          times_redeemed: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          amount_off?: number | null
          applies_to_one_time?: boolean | null
          applies_to_products?: string[] | null
          applies_to_subscriptions?: boolean | null
          code: string
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_type?: string
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          name?: string | null
          percent_off?: number | null
          stripe_coupon_id?: string | null
          times_redeemed?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          amount_off?: number | null
          applies_to_one_time?: boolean | null
          applies_to_products?: string[] | null
          applies_to_subscriptions?: boolean | null
          code?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_type?: string
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          name?: string | null
          percent_off?: number | null
          stripe_coupon_id?: string | null
          times_redeemed?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
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
          cultural_context: string | null
          description: string | null
          estimated_duration: number | null
          icon_type: string | null
          id: string
          learning_outcomes: Json | null
          listening_references: Json | null
          order_index: number
          region_name: string | null
          spotify_urls: string[] | null
          title: string
          updated_at: string
          youtube_urls: string[] | null
        }
        Insert: {
          color_theme?: string | null
          course_id: string
          created_at?: string
          cultural_context?: string | null
          description?: string | null
          estimated_duration?: number | null
          icon_type?: string | null
          id?: string
          learning_outcomes?: Json | null
          listening_references?: Json | null
          order_index?: number
          region_name?: string | null
          spotify_urls?: string[] | null
          title: string
          updated_at?: string
          youtube_urls?: string[] | null
        }
        Update: {
          color_theme?: string | null
          course_id?: string
          created_at?: string
          cultural_context?: string | null
          description?: string | null
          estimated_duration?: number | null
          icon_type?: string | null
          id?: string
          learning_outcomes?: Json | null
          listening_references?: Json | null
          order_index?: number
          region_name?: string | null
          spotify_urls?: string[] | null
          title?: string
          updated_at?: string
          youtube_urls?: string[] | null
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
          tags: string[] | null
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
          tags?: string[] | null
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
          tags?: string[] | null
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
          send_to_all: boolean | null
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
          send_to_all?: boolean | null
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
          send_to_all?: boolean | null
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
          unsubscribe_reason: string | null
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
          unsubscribe_reason?: string | null
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
          unsubscribe_reason?: string | null
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
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
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
      group_channels: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          icon: string | null
          id: string
          name: string
          order_index: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_channels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
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
          channel_id: string | null
          created_at: string
          created_by: string
          ends_at: string | null
          group_id: string
          id: string
          is_multiple_choice: boolean | null
          is_pinned: boolean | null
          options: Json
          question: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          created_by: string
          ends_at?: string | null
          group_id: string
          id?: string
          is_multiple_choice?: boolean | null
          is_pinned?: boolean | null
          options?: Json
          question: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          group_id?: string
          id?: string
          is_multiple_choice?: boolean | null
          is_pinned?: boolean | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
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
          channel_id: string | null
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
          channel_id?: string | null
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
          channel_id?: string | null
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
            foreignKeyName: "group_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_questionnaires: {
        Row: {
          allow_multiple_responses: boolean | null
          channel_id: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple_responses?: boolean | null
          channel_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          questions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple_responses?: boolean | null
          channel_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_questionnaires_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_questionnaires_group_id_fkey"
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
      invoices: {
        Row: {
          amount: number
          client_address: string | null
          client_email: string | null
          client_name: string
          created_at: string
          currency: string | null
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      media_artists: {
        Row: {
          bio: string | null
          created_at: string
          external_links: Json | null
          id: string
          image_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          external_links?: Json | null
          id?: string
          image_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          external_links?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
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
      media_likes: {
        Row: {
          created_at: string
          id: string
          track_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          track_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "media_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      media_playlist_tracks: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          track_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "media_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "media_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      media_playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      media_plays: {
        Row: {
          completed: boolean | null
          duration_played_seconds: number | null
          id: string
          ip_hash: string | null
          played_at: string
          session_id: string | null
          track_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          duration_played_seconds?: number | null
          id?: string
          ip_hash?: string | null
          played_at?: string
          session_id?: string | null
          track_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          duration_played_seconds?: number | null
          id?: string
          ip_hash?: string | null
          played_at?: string
          session_id?: string | null
          track_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_plays_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "media_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      media_podcasts: {
        Row: {
          author: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          last_fetched_at: string | null
          rss_url: string | null
          title: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          author?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          rss_url?: string | null
          title: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          author?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          rss_url?: string | null
          title?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      media_tracks: {
        Row: {
          album_name: string | null
          artist_id: string | null
          audio_url: string
          content_type: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          episode_number: number | null
          genre: string | null
          id: string
          is_published: boolean | null
          media_type: string
          play_count: number | null
          podcast_id: string | null
          release_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          album_name?: string | null
          artist_id?: string | null
          audio_url: string
          content_type?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean | null
          media_type?: string
          play_count?: number | null
          podcast_id?: string | null
          release_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          album_name?: string | null
          artist_id?: string | null
          audio_url?: string
          content_type?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean | null
          media_type?: string
          play_count?: number | null
          podcast_id?: string | null
          release_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_tracks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "media_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_tracks_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "media_podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          group_comment_id: string | null
          group_post_id: string | null
          id: string
          is_read: boolean | null
          mentioned_by_user_id: string
          mentioned_user_id: string
          post_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          group_comment_id?: string | null
          group_post_id?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_by_user_id: string
          mentioned_user_id: string
          post_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          group_comment_id?: string | null
          group_post_id?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_by_user_id?: string
          mentioned_user_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_group_comment_id_fkey"
            columns: ["group_comment_id"]
            isOneToOne: false
            referencedRelation: "group_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
          file_attachments: Json | null
          id: string
          lesson_type: string
          listening_references: Json | null
          module_id: string
          order_index: number
          soundslice_preset: string | null
          spotify_urls: string[] | null
          title: string
          updated_at: string
          video_url: string | null
          youtube_urls: string[] | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_attachments?: Json | null
          id?: string
          lesson_type?: string
          listening_references?: Json | null
          module_id: string
          order_index?: number
          soundslice_preset?: string | null
          spotify_urls?: string[] | null
          title: string
          updated_at?: string
          video_url?: string | null
          youtube_urls?: string[] | null
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_attachments?: Json | null
          id?: string
          lesson_type?: string
          listening_references?: Json | null
          module_id?: string
          order_index?: number
          soundslice_preset?: string | null
          spotify_urls?: string[] | null
          title?: string
          updated_at?: string
          video_url?: string | null
          youtube_urls?: string[] | null
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
      orders: {
        Row: {
          amount: number
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string
          currency: string
          customer_name: string | null
          email: string
          id: string
          net_amount: number | null
          payment_provider: string
          paypal_fee: number | null
          product_id: string
          provider_payment_id: string | null
          provider_refund_id: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
          stripe_fee: number | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          email: string
          id?: string
          net_amount?: number | null
          payment_provider: string
          paypal_fee?: number | null
          product_id: string
          provider_payment_id?: string | null
          provider_refund_id?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          stripe_fee?: number | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          email?: string
          id?: string
          net_amount?: number | null
          payment_provider?: string
          paypal_fee?: number | null
          product_id?: string
          provider_payment_id?: string | null
          provider_refund_id?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          stripe_fee?: number | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
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
      paypal_pending_orders: {
        Row: {
          captured_at: string | null
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string
          currency: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          original_amount: number | null
          product_details: Json
          product_ids: string[]
          total_amount: number
        }
        Insert: {
          captured_at?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          currency?: string | null
          email: string
          expires_at?: string
          full_name: string
          id?: string
          original_amount?: number | null
          product_details: Json
          product_ids: string[]
          total_amount: number
        }
        Update: {
          captured_at?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          currency?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          original_amount?: number | null
          product_details?: Json
          product_ids?: string[]
          total_amount?: number
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
      product_expert_attributions: {
        Row: {
          attribution_percentage: number
          created_at: string
          expert_name: string
          id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          attribution_percentage: number
          created_at?: string
          expert_name: string
          id?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          attribution_percentage?: number
          created_at?: string
          expert_name?: string
          id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_expert_attributions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purchase_tags: {
        Row: {
          created_at: string
          id: string
          product_id: string
          remove_on_refund: boolean | null
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          remove_on_refund?: boolean | null
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          remove_on_refund?: boolean | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_purchase_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "email_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_regional_pricing: {
        Row: {
          created_at: string
          currency: string
          discount_percentage: number
          fixed_price: number | null
          id: string
          product_id: string
          region: Database["public"]["Enums"]["pricing_region"]
        }
        Insert: {
          created_at?: string
          currency?: string
          discount_percentage?: number
          fixed_price?: number | null
          id?: string
          product_id: string
          region: Database["public"]["Enums"]["pricing_region"]
        }
        Update: {
          created_at?: string
          currency?: string
          discount_percentage?: number
          fixed_price?: number | null
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
          billing_interval: string | null
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product_type: string
          purchase_tag_id: string | null
          pwyf_enabled: boolean | null
          pwyf_max_price_usd: number | null
          pwyf_min_price_usd: number | null
          pwyf_suggested_price_usd: number | null
          refund_remove_tag: boolean | null
          sale_ends_at: string | null
          sale_price_usd: number | null
          trial_enabled: boolean | null
          trial_length_days: number | null
          trial_price_usd: number | null
          tutor_id: string | null
          updated_at: string
        }
        Insert: {
          base_price_usd?: number
          billing_interval?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_type?: string
          purchase_tag_id?: string | null
          pwyf_enabled?: boolean | null
          pwyf_max_price_usd?: number | null
          pwyf_min_price_usd?: number | null
          pwyf_suggested_price_usd?: number | null
          refund_remove_tag?: boolean | null
          sale_ends_at?: string | null
          sale_price_usd?: number | null
          trial_enabled?: boolean | null
          trial_length_days?: number | null
          trial_price_usd?: number | null
          tutor_id?: string | null
          updated_at?: string
        }
        Update: {
          base_price_usd?: number
          billing_interval?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_type?: string
          purchase_tag_id?: string | null
          pwyf_enabled?: boolean | null
          pwyf_max_price_usd?: number | null
          pwyf_min_price_usd?: number | null
          pwyf_suggested_price_usd?: number | null
          refund_remove_tag?: boolean | null
          sale_ends_at?: string | null
          sale_price_usd?: number | null
          trial_enabled?: boolean | null
          trial_length_days?: number | null
          trial_price_usd?: number | null
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
          auto_add_late_payment_message: boolean | null
          auto_add_thank_you_message: boolean | null
          avatar_url: string | null
          bank_details: string | null
          bio: string | null
          business_name: string | null
          cover_image_url: string | null
          created_at: string
          default_currency: string | null
          default_late_payment_message_id: string | null
          default_thank_you_message_id: string | null
          display_name_preference: string | null
          email: string
          email_verified: boolean | null
          email_verified_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          invoice_late_payment_messages: Json | null
          invoice_thank_you_messages: Json | null
          is_public: boolean | null
          last_name: string | null
          logo_url: string | null
          message_privacy: string | null
          notification_email_comments: boolean | null
          notification_email_friend_requests: boolean | null
          notification_email_invoices: boolean | null
          notification_email_mentions: boolean | null
          notification_email_reminders: boolean | null
          notification_push_events: boolean | null
          notification_push_messages: boolean | null
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
          visibility: Database["public"]["Enums"]["profile_visibility"] | null
          website_url: string | null
          wp_password_hash: string | null
          wp_user_id: number | null
        }
        Insert: {
          address?: string | null
          auto_add_late_payment_message?: boolean | null
          auto_add_thank_you_message?: boolean | null
          avatar_url?: string | null
          bank_details?: string | null
          bio?: string | null
          business_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string | null
          default_late_payment_message_id?: string | null
          default_thank_you_message_id?: string | null
          display_name_preference?: string | null
          email: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          invoice_late_payment_messages?: Json | null
          invoice_thank_you_messages?: Json | null
          is_public?: boolean | null
          last_name?: string | null
          logo_url?: string | null
          message_privacy?: string | null
          notification_email_comments?: boolean | null
          notification_email_friend_requests?: boolean | null
          notification_email_invoices?: boolean | null
          notification_email_mentions?: boolean | null
          notification_email_reminders?: boolean | null
          notification_push_events?: boolean | null
          notification_push_messages?: boolean | null
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
          visibility?: Database["public"]["Enums"]["profile_visibility"] | null
          website_url?: string | null
          wp_password_hash?: string | null
          wp_user_id?: number | null
        }
        Update: {
          address?: string | null
          auto_add_late_payment_message?: boolean | null
          auto_add_thank_you_message?: boolean | null
          avatar_url?: string | null
          bank_details?: string | null
          bio?: string | null
          business_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string | null
          default_late_payment_message_id?: string | null
          default_thank_you_message_id?: string | null
          display_name_preference?: string | null
          email?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          invoice_late_payment_messages?: Json | null
          invoice_thank_you_messages?: Json | null
          is_public?: boolean | null
          last_name?: string | null
          logo_url?: string | null
          message_privacy?: string | null
          notification_email_comments?: boolean | null
          notification_email_friend_requests?: boolean | null
          notification_email_invoices?: boolean | null
          notification_email_mentions?: boolean | null
          notification_email_reminders?: boolean | null
          notification_push_events?: boolean | null
          notification_push_messages?: boolean | null
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
          visibility?: Database["public"]["Enums"]["profile_visibility"] | null
          website_url?: string | null
          wp_password_hash?: string | null
          wp_user_id?: number | null
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          answers: Json
          created_at: string
          id: string
          questionnaire_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          questionnaire_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          questionnaire_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "group_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          report_type: string
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          report_type: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          report_type?: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
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
      subscription_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          subscription_product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          subscription_product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          subscription_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_subscription_product_id_fkey"
            columns: ["subscription_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          cancels_at: string | null
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          interval: string | null
          paused_at: string | null
          payment_provider: string
          pending_paypal_subscription_id: string | null
          product_id: string
          product_name: string | null
          provider_subscription_id: string | null
          status: string
          trial_end: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          cancelled_at?: string | null
          cancels_at?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          interval?: string | null
          paused_at?: string | null
          payment_provider: string
          pending_paypal_subscription_id?: string | null
          product_id: string
          product_name?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_end?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          cancels_at?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          interval?: string | null
          paused_at?: string | null
          payment_provider?: string
          pending_paypal_subscription_id?: string | null
          product_id?: string
          product_name?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_end?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
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
      verify_email_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          message: string
          success: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff" | "expert"
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
      profile_visibility: "private" | "members" | "public"
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
      app_role: ["admin", "user", "staff", "expert"],
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
      profile_visibility: ["private", "members", "public"],
    },
  },
} as const
