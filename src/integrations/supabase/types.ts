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
      account_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          requested_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          requested_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          requested_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      children: {
        Row: {
          age: number
          created_at: string | null
          email: string | null
          first_name: string
          grade_level: string | null
          id: string
          last_name: string
          name: string
          school: string
          user_id: string
        }
        Insert: {
          age: number
          created_at?: string | null
          email?: string | null
          first_name?: string
          grade_level?: string | null
          id?: string
          last_name?: string
          name: string
          school: string
          user_id: string
        }
        Update: {
          age?: number
          created_at?: string | null
          email?: string | null
          first_name?: string
          grade_level?: string | null
          id?: string
          last_name?: string
          name?: string
          school?: string
          user_id?: string
        }
        Relationships: []
      }
      co_parent_links: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_parent_links_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_parent_links_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_parent_links_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_parent_links_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_id: string | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_notification_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      private_ride_requests: {
        Row: {
          created_at: string
          distance_from_route: number | null
          dropoff_address: string
          dropoff_latitude: number
          dropoff_longitude: number
          id: string
          is_round_trip: boolean
          message: string | null
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          pickup_time: string
          recipient_id: string
          recipient_selected_children: Json | null
          request_type: Database["public"]["Enums"]["private_request_type"]
          responded_at: string | null
          return_time: string | null
          ride_date: string
          seats_needed: number | null
          seats_offered: number | null
          selected_children: Json | null
          sender_id: string
          status: Database["public"]["Enums"]["private_request_status"]
          updated_at: string
          vehicle_info: Json | null
        }
        Insert: {
          created_at?: string
          distance_from_route?: number | null
          dropoff_address: string
          dropoff_latitude: number
          dropoff_longitude: number
          id?: string
          is_round_trip?: boolean
          message?: string | null
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          pickup_time: string
          recipient_id: string
          recipient_selected_children?: Json | null
          request_type: Database["public"]["Enums"]["private_request_type"]
          responded_at?: string | null
          return_time?: string | null
          ride_date: string
          seats_needed?: number | null
          seats_offered?: number | null
          selected_children?: Json | null
          sender_id: string
          status?: Database["public"]["Enums"]["private_request_status"]
          updated_at?: string
          vehicle_info?: Json | null
        }
        Update: {
          created_at?: string
          distance_from_route?: number | null
          dropoff_address?: string
          dropoff_latitude?: number
          dropoff_longitude?: number
          id?: string
          is_round_trip?: boolean
          message?: string | null
          pickup_address?: string
          pickup_latitude?: number
          pickup_longitude?: number
          pickup_time?: string
          recipient_id?: string
          recipient_selected_children?: Json | null
          request_type?: Database["public"]["Enums"]["private_request_type"]
          responded_at?: string | null
          return_time?: string | null
          ride_date?: string
          seats_needed?: number | null
          seats_offered?: number | null
          selected_children?: Json | null
          sender_id?: string
          status?: Database["public"]["Enums"]["private_request_status"]
          updated_at?: string
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "private_ride_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_ride_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_ride_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_ride_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          accept_requests_from_anyone: boolean | null
          account_type: string
          avatar_url: string | null
          car_color: string | null
          car_make: string | null
          car_model: string | null
          car_seats: number | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          grade_level: string | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          last_name: string | null
          license_plate: string | null
          parent_guardian_email: string | null
          parent_guardian_name: string | null
          parent_guardian_phone: string | null
          phone_number: string | null
          profile_complete: boolean
          share_email: boolean | null
          share_phone: boolean | null
          show_on_map: boolean | null
          two_factor_enabled: boolean
          updated_at: string
          username: string
        }
        Insert: {
          accept_requests_from_anyone?: boolean | null
          account_type: string
          avatar_url?: string | null
          car_color?: string | null
          car_make?: string | null
          car_model?: string | null
          car_seats?: number | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          grade_level?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id: string
          last_name?: string | null
          license_plate?: string | null
          parent_guardian_email?: string | null
          parent_guardian_name?: string | null
          parent_guardian_phone?: string | null
          phone_number?: string | null
          profile_complete?: boolean
          share_email?: boolean | null
          share_phone?: boolean | null
          show_on_map?: boolean | null
          two_factor_enabled?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          accept_requests_from_anyone?: boolean | null
          account_type?: string
          avatar_url?: string | null
          car_color?: string | null
          car_make?: string | null
          car_model?: string | null
          car_seats?: number | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          grade_level?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          last_name?: string | null
          license_plate?: string | null
          parent_guardian_email?: string | null
          parent_guardian_name?: string | null
          parent_guardian_phone?: string | null
          phone_number?: string | null
          profile_complete?: boolean
          share_email?: boolean | null
          share_phone?: boolean | null
          show_on_map?: boolean | null
          two_factor_enabled?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recurring_ride_cancellations: {
        Row: {
          cancelled_by: string
          cancelled_date: string
          created_at: string
          id: string
          recurring_ride_id: string
        }
        Insert: {
          cancelled_by: string
          cancelled_date: string
          created_at?: string
          id?: string
          recurring_ride_id: string
        }
        Update: {
          cancelled_by?: string
          cancelled_date?: string
          created_at?: string
          id?: string
          recurring_ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_ride_cancellations_recurring_ride_id_fkey"
            columns: ["recurring_ride_id"]
            isOneToOne: false
            referencedRelation: "recurring_rides"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rides: {
        Row: {
          created_at: string
          creator_children: Json | null
          creator_id: string
          dropoff_address: string
          dropoff_latitude: number
          dropoff_longitude: number
          id: string
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          recipient_children: Json | null
          recipient_id: string
          recurring_days: string[]
          ride_time: string
          ride_type: string
          seats_available: number | null
          seats_needed: number | null
          space_id: string
          status: string
          updated_at: string
          vehicle_info: Json | null
        }
        Insert: {
          created_at?: string
          creator_children?: Json | null
          creator_id: string
          dropoff_address: string
          dropoff_latitude: number
          dropoff_longitude: number
          id?: string
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          recipient_children?: Json | null
          recipient_id: string
          recurring_days: string[]
          ride_time: string
          ride_type: string
          seats_available?: number | null
          seats_needed?: number | null
          space_id: string
          status?: string
          updated_at?: string
          vehicle_info?: Json | null
        }
        Update: {
          created_at?: string
          creator_children?: Json | null
          creator_id?: string
          dropoff_address?: string
          dropoff_latitude?: number
          dropoff_longitude?: number
          id?: string
          pickup_address?: string
          pickup_latitude?: number
          pickup_longitude?: number
          recipient_children?: Json | null
          recipient_id?: string
          recurring_days?: string[]
          ride_time?: string
          ride_type?: string
          seats_available?: number | null
          seats_needed?: number | null
          space_id?: string
          status?: string
          updated_at?: string
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rides_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "series_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_schedules: {
        Row: {
          created_at: string
          day_assignments: Json
          id: string
          proposer_children: Json
          proposer_id: string
          proposer_regular_time: string | null
          proposer_vehicle: Json | null
          proposer_wednesday_time: string | null
          recipient_children: Json | null
          recipient_id: string
          recipient_regular_time: string | null
          recipient_vehicle: Json | null
          recipient_wednesday_time: string | null
          space_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_assignments: Json
          id?: string
          proposer_children?: Json
          proposer_id: string
          proposer_regular_time?: string | null
          proposer_vehicle?: Json | null
          proposer_wednesday_time?: string | null
          recipient_children?: Json | null
          recipient_id: string
          recipient_regular_time?: string | null
          recipient_vehicle?: Json | null
          recipient_wednesday_time?: string | null
          space_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_assignments?: Json
          id?: string
          proposer_children?: Json
          proposer_id?: string
          proposer_regular_time?: string | null
          proposer_vehicle?: Json | null
          proposer_wednesday_time?: string | null
          recipient_children?: Json | null
          recipient_id?: string
          recipient_regular_time?: string | null
          recipient_vehicle?: Json | null
          recipient_wednesday_time?: string | null
          space_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "series_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_conversations: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read_at: string | null
          recipient_id: string
          ride_id: string
          selected_children: Json | null
          sender_id: string
          status: string
          updated_at: string | null
          vehicle_info: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          recipient_id: string
          ride_id: string
          selected_children?: Json | null
          sender_id: string
          status?: string
          updated_at?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          recipient_id?: string
          ride_id?: string
          selected_children?: Json | null
          sender_id?: string
          status?: string
          updated_at?: string | null
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_conversations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_conversations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_conversations_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_conversations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_conversations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          ride_ref_id: string
          ride_source: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          ride_ref_id: string
          ride_source: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          ride_ref_id?: string
          ride_source?: string
          sender_id?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          created_at: string | null
          dropoff_latitude: number | null
          dropoff_location: string
          dropoff_longitude: number | null
          id: string
          is_fulfilled: boolean
          is_recurring: boolean | null
          pickup_latitude: number | null
          pickup_location: string
          pickup_longitude: number | null
          recipient_id: string | null
          recurring_days: string[] | null
          ride_date: string
          ride_time: string
          route_details: string | null
          seats_available: number | null
          seats_needed: number | null
          selected_children: Json | null
          status: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          type: string
          user_id: string
          vehicle_info: Json | null
        }
        Insert: {
          created_at?: string | null
          dropoff_latitude?: number | null
          dropoff_location: string
          dropoff_longitude?: number | null
          id?: string
          is_fulfilled?: boolean
          is_recurring?: boolean | null
          pickup_latitude?: number | null
          pickup_location: string
          pickup_longitude?: number | null
          recipient_id?: string | null
          recurring_days?: string[] | null
          ride_date: string
          ride_time: string
          route_details?: string | null
          seats_available?: number | null
          seats_needed?: number | null
          selected_children?: Json | null
          status?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          type: string
          user_id: string
          vehicle_info?: Json | null
        }
        Update: {
          created_at?: string | null
          dropoff_latitude?: number | null
          dropoff_location?: string
          dropoff_longitude?: number | null
          id?: string
          is_fulfilled?: boolean
          is_recurring?: boolean | null
          pickup_latitude?: number | null
          pickup_location?: string
          pickup_longitude?: number | null
          recipient_id?: string | null
          recurring_days?: string[] | null
          ride_date?: string
          ride_time?: string
          route_details?: string | null
          seats_available?: number | null
          seats_needed?: number | null
          selected_children?: Json | null
          status?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          type?: string
          user_id?: string
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_cancellations: {
        Row: {
          cancelled_by: string
          cancelled_date: string
          cancelled_day: string
          created_at: string
          id: string
          schedule_id: string
        }
        Insert: {
          cancelled_by: string
          cancelled_date: string
          cancelled_day: string
          created_at?: string
          id?: string
          schedule_id: string
        }
        Update: {
          cancelled_by?: string
          cancelled_date?: string
          cancelled_day?: string
          created_at?: string
          id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_cancellations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          school_type: string | null
          state: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          school_type?: string | null
          state: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          school_type?: string | null
          state?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      series_child_selections: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
          space_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
          space_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_child_selections_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_child_selections_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "series_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      series_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          sender_id: string
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          sender_id: string
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          sender_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_messages_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "series_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      series_spaces: {
        Row: {
          created_at: string
          id: string
          parent_a_id: string
          parent_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_a_id: string
          parent_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_a_id?: string
          parent_b_id?: string
        }
        Relationships: []
      }
      signup_verification_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_parent_links: {
        Row: {
          approved_at: string | null
          code_expires_at: string | null
          created_at: string | null
          id: string
          parent_id: string
          status: string
          student_id: string
          verification_code: string | null
        }
        Insert: {
          approved_at?: string | null
          code_expires_at?: string | null
          created_at?: string | null
          id?: string
          parent_id: string
          status?: string
          student_id: string
          verification_code?: string | null
        }
        Update: {
          approved_at?: string | null
          code_expires_at?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string
          status?: string
          student_id?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          purpose: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
          used_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          failed_login_attempts: number
          first_name: string
          is_verified: boolean
          last_failed_login: string | null
          last_login: string | null
          last_name: string
          password_hash: string
          phone_number: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_login_attempts?: number
          first_name: string
          is_verified?: boolean
          last_failed_login?: string | null
          last_login?: string | null
          last_name: string
          password_hash: string
          phone_number?: string | null
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_login_attempts?: number
          first_name?: string
          is_verified?: boolean
          last_failed_login?: string | null
          last_login?: string | null
          last_name?: string
          password_hash?: string
          phone_number?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          car_color: string
          car_make: string
          car_model: string
          created_at: string
          id: string
          is_primary: boolean
          license_plate: string
          user_id: string
        }
        Insert: {
          car_color: string
          car_make: string
          car_model: string
          created_at?: string
          id?: string
          is_primary?: boolean
          license_plate: string
          user_id: string
        }
        Update: {
          car_color?: string
          car_make?: string
          car_model?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          license_plate?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          accept_requests_from_anyone: boolean | null
          account_type: string | null
          avatar_url: string | null
          car_color: string | null
          car_make: string | null
          car_model: string | null
          car_seats: number | null
          first_name: string | null
          grade_level: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string | null
          last_name: string | null
          phone_number: string | null
          profile_complete: boolean | null
          share_email: boolean | null
          share_phone: boolean | null
          show_on_map: boolean | null
          username: string | null
        }
        Insert: {
          accept_requests_from_anyone?: boolean | null
          account_type?: string | null
          avatar_url?: string | null
          car_color?: string | null
          car_make?: string | null
          car_model?: string | null
          car_seats?: number | null
          first_name?: string | null
          grade_level?: string | null
          home_latitude?: never
          home_longitude?: never
          id?: string | null
          last_name?: string | null
          phone_number?: never
          profile_complete?: boolean | null
          share_email?: boolean | null
          share_phone?: boolean | null
          show_on_map?: boolean | null
          username?: string | null
        }
        Update: {
          accept_requests_from_anyone?: boolean | null
          account_type?: string | null
          avatar_url?: string | null
          car_color?: string | null
          car_make?: string | null
          car_model?: string | null
          car_seats?: number | null
          first_name?: string | null
          grade_level?: string | null
          home_latitude?: never
          home_longitude?: never
          id?: string | null
          last_name?: string | null
          phone_number?: never
          profile_complete?: boolean | null
          share_email?: boolean | null
          share_phone?: boolean | null
          show_on_map?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      student_parent_links_safe: {
        Row: {
          approved_at: string | null
          created_at: string | null
          id: string | null
          parent_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          id?: string | null
          parent_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          id?: string | null
          parent_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      users_safe: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          is_verified: boolean | null
          last_login: string | null
          last_name: string | null
          phone_number: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          is_verified?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone_number?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          is_verified?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone_number?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_duplicate_private_request: {
        Args: {
          p_pickup_time: string
          p_recipient_id: string
          p_ride_date: string
          p_sender_id: string
        }
        Returns: boolean
      }
      cleanup_old_ride_data: { Args: never; Returns: undefined }
      cleanup_past_rides: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_parent_by_child_email: {
        Args: { _email: string }
        Returns: {
          child_id: string
          first_name: string
          grade_level: string
          last_name: string
          parent_id: string
        }[]
      }
      get_family_schedule: {
        Args: { student_user_id: string }
        Returns: {
          connected_parent_first_name: string
          connected_parent_id: string
          connected_parent_last_name: string
          dropoff_latitude: number
          dropoff_location: string
          dropoff_longitude: number
          id: string
          parent_email: string
          parent_first_name: string
          parent_id: string
          parent_last_name: string
          pickup_latitude: number
          pickup_location: string
          pickup_longitude: number
          ride_date: string
          ride_time: string
          seats_available: number
          seats_needed: number
          status: string
          type: string
          user_id: string
        }[]
      }
      get_linked_parents: {
        Args: { student_user_id: string }
        Returns: {
          linked_at: string
          parent_email: string
          parent_first_name: string
          parent_id: string
          parent_last_name: string
        }[]
      }
      get_linked_students: {
        Args: { parent_user_id: string }
        Returns: {
          linked_at: string
          student_email: string
          student_first_name: string
          student_id: string
          student_last_name: string
        }[]
      }
      get_pending_requests_count: {
        Args: { user_user_id: string }
        Returns: number
      }
      get_student_series_child_selections: {
        Args: { student_user_id: string }
        Returns: {
          child_id: string
          parent_id: string
          space_id: string
        }[]
      }
      get_student_series_rides: {
        Args: { student_user_id: string }
        Returns: {
          cancelled_date: string
          cancelled_day: string
          cancelled_schedule_id: string
          day_assignments: Json
          parent_a_id: string
          parent_b_id: string
          proposer_id: string
          proposer_regular_time: string
          proposer_wednesday_time: string
          recipient_id: string
          recipient_regular_time: string
          recipient_wednesday_time: string
          schedule_id: string
          schedule_status: string
          space_id: string
        }[]
      }
      get_top_connections: {
        Args: { current_user_id: string; result_limit?: number }
        Returns: {
          account_type: string
          avatar_url: string
          connected_user_id: string
          connection_score: number
          full_name: string
          message_count: number
          shared_rides: number
        }[]
      }
      get_user_email: { Args: { user_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_miles: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_link_approved: {
        Args: { parent_user_id: string; student_user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_expiring_rides: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reset_ride_fulfillment: {
        Args: { p_ride_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "parent" | "staff" | "admin"
      private_request_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
      private_request_type: "request" | "offer"
      transaction_type: "broadcast" | "direct"
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
      app_role: ["student", "parent", "staff", "admin"],
      private_request_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
      private_request_type: ["request", "offer"],
      transaction_type: ["broadcast", "direct"],
    },
  },
} as const
