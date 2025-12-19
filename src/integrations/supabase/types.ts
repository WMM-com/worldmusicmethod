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
          updated_at?: string
          user_id?: string | null
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
        ]
      }
      profiles: {
        Row: {
          address: string | null
          bank_details: string | null
          business_name: string | null
          created_at: string
          default_currency: string | null
          email: string
          full_name: string | null
          id: string
          logo_url: string | null
          phone: string | null
          tax_country: string | null
          tax_id: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          business_name?: string | null
          created_at?: string
          default_currency?: string | null
          email: string
          full_name?: string | null
          id: string
          logo_url?: string | null
          phone?: string | null
          tax_country?: string | null
          tax_id?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          business_name?: string | null
          created_at?: string
          default_currency?: string | null
          email?: string
          full_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          tax_country?: string | null
          tax_id?: string | null
          updated_at?: string
          vat_number?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
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
