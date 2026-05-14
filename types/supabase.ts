export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          business: string | null
          location: string | null
          phone: string | null
          avatar_url: string | null
          verified: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name?: string | null
          business?: string | null
          location?: string | null
          phone?: string | null
          avatar_url?: string | null
          verified?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          business?: string | null
          location?: string | null
          phone?: string | null
          avatar_url?: string | null
          verified?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      listings: {
        Row: {
          id: string
          seller_id: string | null
          title: string
          price: string
          location: string
          category: string
          subcategory: string | null
          user_id: string
          created_at: string
          updated_at: string | null
          description: string | null
          condition: string | null
          power_type: string | null
          gas_type: string | null
          electrical_phase: string | null
          dimensions: string | null
          service_history: string | null
          warranty_type: string | null
          manuals_available: boolean | null
          tested_status: string | null
          delivery_option: string | null
          delivery_method: string | null
          collection_postcode: string | null
          collection_full_address: string | null
          collection_city: string | null
          seller_contact_name: string | null
          seller_phone: string | null
          vat_included: boolean | null
          weight_kg: number | null
          length_cm: number | null
          width_cm: number | null
          height_cm: number | null
          pallet_weight_kg: number | null
          pallet_length_cm: number | null
          pallet_width_cm: number | null
          pallet_height_cm: number | null
          pallet_count: number | null
          pallet_ready: boolean | null
          tail_lift_required: boolean | null
          forklift_available: boolean | null
          ground_floor_collection: boolean | null
          commercial_premises: boolean | null
          delivery_available: boolean | null
          caterbids_delivery_available: boolean | null
          preferred_collection_date: string | null
          insurance_value: number | null
          access_restrictions: string | null
          delivery_notes: string | null
          delivery_details_confirmed: boolean | null
          ai_delivery_confidence: number | null
          manual_source_url: string | null
          spec_source_url: string | null
          manual_source_name: string | null
          manual_source_type: string | null
          manual_source_validated: boolean | null
          manual_source_last_checked_at: string | null
          manual_source_match_notes: string | null
          ai_spec_confidence: string | null
          specs_verified_by_seller: boolean | null
          specs_last_checked_at: string | null
          source_rejected_by_seller: boolean | null
          image_url: string | null
          images: string[] | null
          city: string | null
          status: string | null
          sold_at: string | null
        }
        Insert: {
          id?: string
          seller_id?: string | null
          title: string
          price: string
          location: string
          category: string
          subcategory?: string | null
          user_id: string
          created_at?: string
          updated_at?: string | null
          description?: string | null
          condition?: string | null
          power_type?: string | null
          gas_type?: string | null
          electrical_phase?: string | null
          dimensions?: string | null
          service_history?: string | null
          warranty_type?: string | null
          manuals_available?: boolean | null
          tested_status?: string | null
          delivery_option?: string | null
          delivery_method?: string | null
          collection_postcode?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          seller_contact_name?: string | null
          seller_phone?: string | null
          vat_included?: boolean | null
          weight_kg?: number | null
          length_cm?: number | null
          width_cm?: number | null
          height_cm?: number | null
          pallet_weight_kg?: number | null
          pallet_length_cm?: number | null
          pallet_width_cm?: number | null
          pallet_height_cm?: number | null
          pallet_count?: number | null
          pallet_ready?: boolean | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          ground_floor_collection?: boolean | null
          commercial_premises?: boolean | null
          delivery_available?: boolean | null
          caterbids_delivery_available?: boolean | null
          preferred_collection_date?: string | null
          insurance_value?: number | null
          access_restrictions?: string | null
          delivery_notes?: string | null
          delivery_details_confirmed?: boolean | null
          ai_delivery_confidence?: number | null
          manual_source_url?: string | null
          spec_source_url?: string | null
          manual_source_name?: string | null
          manual_source_type?: string | null
          manual_source_validated?: boolean | null
          manual_source_last_checked_at?: string | null
          manual_source_match_notes?: string | null
          ai_spec_confidence?: string | null
          specs_verified_by_seller?: boolean | null
          specs_last_checked_at?: string | null
          source_rejected_by_seller?: boolean | null
          image_url?: string | null
          images?: string[] | null
          city?: string | null
          status?: string | null
          sold_at?: string | null
        }
        Update: {
          id?: string
          seller_id?: string | null
          title?: string
          price?: string
          location?: string
          category?: string
          subcategory?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string | null
          description?: string | null
          condition?: string | null
          power_type?: string | null
          gas_type?: string | null
          electrical_phase?: string | null
          dimensions?: string | null
          service_history?: string | null
          warranty_type?: string | null
          manuals_available?: boolean | null
          tested_status?: string | null
          delivery_option?: string | null
          delivery_method?: string | null
          collection_postcode?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          seller_contact_name?: string | null
          seller_phone?: string | null
          vat_included?: boolean | null
          weight_kg?: number | null
          length_cm?: number | null
          width_cm?: number | null
          height_cm?: number | null
          pallet_weight_kg?: number | null
          pallet_length_cm?: number | null
          pallet_width_cm?: number | null
          pallet_height_cm?: number | null
          pallet_count?: number | null
          pallet_ready?: boolean | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          ground_floor_collection?: boolean | null
          commercial_premises?: boolean | null
          delivery_available?: boolean | null
          caterbids_delivery_available?: boolean | null
          preferred_collection_date?: string | null
          insurance_value?: number | null
          access_restrictions?: string | null
          delivery_notes?: string | null
          delivery_details_confirmed?: boolean | null
          ai_delivery_confidence?: number | null
          manual_source_url?: string | null
          spec_source_url?: string | null
          manual_source_name?: string | null
          manual_source_type?: string | null
          manual_source_validated?: boolean | null
          manual_source_last_checked_at?: string | null
          manual_source_match_notes?: string | null
          ai_spec_confidence?: string | null
          specs_verified_by_seller?: boolean | null
          specs_last_checked_at?: string | null
          source_rejected_by_seller?: boolean | null
          image_url?: string | null
          images?: string[] | null
          city?: string | null
          status?: string | null
          sold_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          buyer_id: string | null
          seller_id: string | null
          listing_id: string | null
          platform: string
          participant_name: string
          participant_avatar: string | null
          listing_title: string | null
          last_message: string | null
          last_message_at: string | null
          unread_count: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          buyer_id?: string | null
          seller_id?: string | null
          listing_id?: string | null
          platform?: string
          participant_name: string
          participant_avatar?: string | null
          listing_title?: string | null
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          buyer_id?: string | null
          seller_id?: string | null
          listing_id?: string | null
          platform?: string
          participant_name?: string
          participant_avatar?: string | null
          listing_title?: string | null
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string | null
          recipient_id: string | null
          sender_name: string | null
          body: string | null
          message_text: string | null
          platform: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id?: string | null
          recipient_id?: string | null
          sender_name?: string | null
          body?: string | null
          message_text?: string | null
          platform?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string | null
          recipient_id?: string | null
          sender_name?: string | null
          body?: string | null
          message_text?: string | null
          platform?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      favourites: {
        Row: {
          id: string
          user_id: string
          source: string
          external_id: string
          title: string
          price: string | null
          location: string | null
          category: string | null
          condition: string | null
          image_url: string | null
          url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source: string
          external_id: string
          title: string
          price?: string | null
          location?: string | null
          category?: string | null
          condition?: string | null
          image_url?: string | null
          url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source?: string
          external_id?: string
          title?: string
          price?: string | null
          location?: string | null
          category?: string | null
          condition?: string | null
          image_url?: string | null
          url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string | null
          seller_id: string | null
          delivery_order_id: string | null
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          item_title: string | null
          item_price: number
          delivery_name: string | null
          delivery_price: number
          delivery_provider: string | null
          delivery_quote_id: string | null
          delivery_postcode: string | null
          collection_postcode: string | null
          delivery_booking_required: boolean | null
          delivery_booking_reference: string | null
          delivery_tracking_number: string | null
          delivery_tracking_url: string | null
          delivery_label_url: string | null
          delivery_collection_address: string | null
          delivery_dropoff_address: string | null
          buyer_delivery_full_address: string | null
          buyer_delivery_postcode: string | null
          buyer_phone: string | null
          buyer_access_restrictions: string | null
          collection_full_address: string | null
          collection_city: string | null
          seller_contact_name: string | null
          seller_phone: string | null
          pallet_weight_kg: number | null
          pallet_length_cm: number | null
          pallet_width_cm: number | null
          pallet_height_cm: number | null
          pallet_count: number | null
          tail_lift_required: boolean | null
          forklift_available: boolean | null
          commercial_premises: boolean | null
          preferred_collection_date: string | null
          insurance_value: number | null
          access_restrictions: string | null
          delivery_notes: string | null
          delivery_booked_at: string | null
          total_price: number
          payment_status: string | null
          order_status: string | null
          delivery_status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id?: string | null
          seller_id?: string | null
          delivery_order_id?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          item_title?: string | null
          item_price?: number
          delivery_name?: string | null
          delivery_price?: number
          delivery_provider?: string | null
          delivery_quote_id?: string | null
          delivery_postcode?: string | null
          collection_postcode?: string | null
          delivery_booking_required?: boolean | null
          delivery_booking_reference?: string | null
          delivery_tracking_number?: string | null
          delivery_tracking_url?: string | null
          delivery_label_url?: string | null
          delivery_collection_address?: string | null
          delivery_dropoff_address?: string | null
          buyer_delivery_full_address?: string | null
          buyer_delivery_postcode?: string | null
          buyer_phone?: string | null
          buyer_access_restrictions?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          seller_contact_name?: string | null
          seller_phone?: string | null
          pallet_weight_kg?: number | null
          pallet_length_cm?: number | null
          pallet_width_cm?: number | null
          pallet_height_cm?: number | null
          pallet_count?: number | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          commercial_premises?: boolean | null
          preferred_collection_date?: string | null
          insurance_value?: number | null
          access_restrictions?: string | null
          delivery_notes?: string | null
          delivery_booked_at?: string | null
          total_price?: number
          payment_status?: string | null
          order_status?: string | null
          delivery_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string | null
          seller_id?: string | null
          delivery_order_id?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          item_title?: string | null
          item_price?: number
          delivery_name?: string | null
          delivery_price?: number
          delivery_provider?: string | null
          delivery_quote_id?: string | null
          delivery_postcode?: string | null
          collection_postcode?: string | null
          delivery_booking_required?: boolean | null
          delivery_booking_reference?: string | null
          delivery_tracking_number?: string | null
          delivery_tracking_url?: string | null
          delivery_label_url?: string | null
          delivery_collection_address?: string | null
          delivery_dropoff_address?: string | null
          buyer_delivery_full_address?: string | null
          buyer_delivery_postcode?: string | null
          buyer_phone?: string | null
          buyer_access_restrictions?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          seller_contact_name?: string | null
          seller_phone?: string | null
          pallet_weight_kg?: number | null
          pallet_length_cm?: number | null
          pallet_width_cm?: number | null
          pallet_height_cm?: number | null
          pallet_count?: number | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          commercial_premises?: boolean | null
          preferred_collection_date?: string | null
          insurance_value?: number | null
          access_restrictions?: string | null
          delivery_notes?: string | null
          delivery_booked_at?: string | null
          total_price?: number
          payment_status?: string | null
          order_status?: string | null
          delivery_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          id: string
          listing_id: string
          order_id: string | null
          buyer_id: string | null
          seller_id: string | null
          collection_postcode: string | null
          delivery_postcode: string | null
          pallet_size_name: string | null
          weight_kg: number | null
          length_cm: number | null
          width_cm: number | null
          height_cm: number | null
          pallet_count: number | null
          insurance_value: number | null
          selected_service_name: string | null
          selected_service_price: number | null
          estimated_delivery_time: string | null
          courier_provider: string | null
          delivery_status: string
          tail_lift_required: boolean | null
          forklift_available: boolean | null
          pallet_truck_available: boolean | null
          commercial_premises: boolean | null
          ground_floor_collection: boolean | null
          access_restrictions: string | null
          access_notes: string | null
          pallet_ready_confirmed: boolean | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tracking_number: string | null
          tracking_url: string | null
          courier_name: string | null
          courier_reference: string | null
          is_test: boolean
          paid_at: string | null
          requested_at: string | null
          booked_at: string | null
          collected_at: string | null
          delivered_at: string | null
          cancelled_at: string | null
          failed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          order_id?: string | null
          buyer_id?: string | null
          seller_id?: string | null
          collection_postcode?: string | null
          delivery_postcode?: string | null
          pallet_size_name?: string | null
          weight_kg?: number | null
          length_cm?: number | null
          width_cm?: number | null
          height_cm?: number | null
          pallet_count?: number | null
          insurance_value?: number | null
          selected_service_name?: string | null
          selected_service_price?: number | null
          estimated_delivery_time?: string | null
          courier_provider?: string | null
          delivery_status?: string
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          pallet_truck_available?: boolean | null
          commercial_premises?: boolean | null
          ground_floor_collection?: boolean | null
          access_restrictions?: string | null
          access_notes?: string | null
          pallet_ready_confirmed?: boolean | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          courier_name?: string | null
          courier_reference?: string | null
          is_test?: boolean
          paid_at?: string | null
          requested_at?: string | null
          booked_at?: string | null
          collected_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          failed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          order_id?: string | null
          buyer_id?: string | null
          seller_id?: string | null
          collection_postcode?: string | null
          delivery_postcode?: string | null
          pallet_size_name?: string | null
          weight_kg?: number | null
          length_cm?: number | null
          width_cm?: number | null
          height_cm?: number | null
          pallet_count?: number | null
          insurance_value?: number | null
          selected_service_name?: string | null
          selected_service_price?: number | null
          estimated_delivery_time?: string | null
          courier_provider?: string | null
          delivery_status?: string
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          pallet_truck_available?: boolean | null
          commercial_premises?: boolean | null
          ground_floor_collection?: boolean | null
          access_restrictions?: string | null
          access_notes?: string | null
          pallet_ready_confirmed?: boolean | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          courier_name?: string | null
          courier_reference?: string | null
          is_test?: boolean
          paid_at?: string | null
          requested_at?: string | null
          booked_at?: string | null
          collected_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          failed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          id: string
          dedupe_key: string
          order_id: string | null
          delivery_order_id: string | null
          recipient_user_id: string | null
          recipient_email: string | null
          template: string
          subject: string
          body: string
          status: string
          provider: string | null
          sent_at: string | null
          error: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dedupe_key: string
          order_id?: string | null
          delivery_order_id?: string | null
          recipient_user_id?: string | null
          recipient_email?: string | null
          template: string
          subject: string
          body: string
          status?: string
          provider?: string | null
          sent_at?: string | null
          error?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dedupe_key?: string
          order_id?: string | null
          delivery_order_id?: string | null
          recipient_user_id?: string | null
          recipient_email?: string | null
          template?: string
          subject?: string
          body?: string
          status?: string
          provider?: string | null
          sent_at?: string | null
          error?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          id: string
          user_id: string
          query: string
          location: string | null
          category: string
          condition: string
          search_url: string | null
          search_query: string | null
          city: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          location?: string | null
          category: string
          condition: string
          search_url?: string | null
          search_query?: string | null
          city?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          location?: string | null
          category?: string
          condition?: string
          search_url?: string | null
          search_query?: string | null
          city?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
