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
          seller_contact_name: string | null
          collection_full_address: string | null
          collection_city: string | null
          collection_postcode: string | null
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
          seller_contact_name?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          collection_postcode?: string | null
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
          seller_contact_name?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          collection_postcode?: string | null
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
          depth_cm: number | null
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
          estimated_weight: string | null
          estimated_weight_kg: number | null
          gross_weight_kg: number | null
          packed_width_cm: number | null
          packed_depth_cm: number | null
          packed_height_cm: number | null
          packed_dimensions: string | null
          delivery_type: string | null
          shipping_class: string | null
          pallet_delivery_recommended: boolean | null
          specialist_delivery_recommended: boolean | null
          forklift_required: boolean | null
          two_person_lift_recommended: boolean | null
          shipping_confidence: string | null
          shipping_details_confirmed_by_seller: boolean | null
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
          equipment_spec_id: string | null
          spec_plate_image_url: string | null
          spec_plate_ocr_text: string | null
          spec_brand: string | null
          spec_model: string | null
          spec_serial_number: string | null
          spec_gc_number: string | null
          spec_moderation_status: string | null
          spec_moderation_notes: string | null
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
          depth_cm?: number | null
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
          estimated_weight?: string | null
          estimated_weight_kg?: number | null
          gross_weight_kg?: number | null
          packed_width_cm?: number | null
          packed_depth_cm?: number | null
          packed_height_cm?: number | null
          packed_dimensions?: string | null
          delivery_type?: string | null
          shipping_class?: string | null
          pallet_delivery_recommended?: boolean | null
          specialist_delivery_recommended?: boolean | null
          forklift_required?: boolean | null
          two_person_lift_recommended?: boolean | null
          shipping_confidence?: string | null
          shipping_details_confirmed_by_seller?: boolean | null
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
          equipment_spec_id?: string | null
          spec_plate_image_url?: string | null
          spec_plate_ocr_text?: string | null
          spec_brand?: string | null
          spec_model?: string | null
          spec_serial_number?: string | null
          spec_gc_number?: string | null
          spec_moderation_status?: string | null
          spec_moderation_notes?: string | null
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
          depth_cm?: number | null
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
          estimated_weight?: string | null
          estimated_weight_kg?: number | null
          gross_weight_kg?: number | null
          packed_width_cm?: number | null
          packed_depth_cm?: number | null
          packed_height_cm?: number | null
          packed_dimensions?: string | null
          delivery_type?: string | null
          shipping_class?: string | null
          pallet_delivery_recommended?: boolean | null
          specialist_delivery_recommended?: boolean | null
          forklift_required?: boolean | null
          two_person_lift_recommended?: boolean | null
          shipping_confidence?: string | null
          shipping_details_confirmed_by_seller?: boolean | null
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
          equipment_spec_id?: string | null
          spec_plate_image_url?: string | null
          spec_plate_ocr_text?: string | null
          spec_brand?: string | null
          spec_model?: string | null
          spec_serial_number?: string | null
          spec_gc_number?: string | null
          spec_moderation_status?: string | null
          spec_moderation_notes?: string | null
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
      Sources: {
        Row: {
          id: string
          domain: string
          source_name: string | null
          source_type: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          default_trust: number
          notes: string | null
          last_checked: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          domain: string
          source_name?: string | null
          source_type?: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          default_trust?: number
          notes?: string | null
          last_checked?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          domain?: string
          source_name?: string | null
          source_type?: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          default_trust?: number
          notes?: string | null
          last_checked?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      EquipmentSpecs: {
        Row: {
          id: string
          brand: string
          model: string
          category: string
          ext_height_cm: number | null
          ext_width_cm: number | null
          ext_depth_cm: number | null
          pack_height_cm: number | null
          pack_width_cm: number | null
          pack_depth_cm: number | null
          weight_net_kg: number | null
          weight_gross_kg: number | null
          pallet_required: boolean
          power_type: string | null
          voltage: string | null
          phase: number | null
          current_a: number | null
          gas_type: string | null
          gas_connection: string | null
          lifting_notes: string | null
          disassembly_notes: string | null
          hazardous_notes: string | null
          source_url: string | null
          source_name: string | null
          source_type: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          confidence: number
          last_checked: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          brand: string
          model: string
          category: string
          ext_height_cm?: number | null
          ext_width_cm?: number | null
          ext_depth_cm?: number | null
          pack_height_cm?: number | null
          pack_width_cm?: number | null
          pack_depth_cm?: number | null
          weight_net_kg?: number | null
          weight_gross_kg?: number | null
          pallet_required?: boolean
          power_type?: string | null
          voltage?: string | null
          phase?: number | null
          current_a?: number | null
          gas_type?: string | null
          gas_connection?: string | null
          lifting_notes?: string | null
          disassembly_notes?: string | null
          hazardous_notes?: string | null
          source_url?: string | null
          source_name?: string | null
          source_type?: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          confidence?: number
          last_checked?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          brand?: string
          model?: string
          category?: string
          ext_height_cm?: number | null
          ext_width_cm?: number | null
          ext_depth_cm?: number | null
          pack_height_cm?: number | null
          pack_width_cm?: number | null
          pack_depth_cm?: number | null
          weight_net_kg?: number | null
          weight_gross_kg?: number | null
          pallet_required?: boolean
          power_type?: string | null
          voltage?: string | null
          phase?: number | null
          current_a?: number | null
          gas_type?: string | null
          gas_connection?: string | null
          lifting_notes?: string | null
          disassembly_notes?: string | null
          hazardous_notes?: string | null
          source_url?: string | null
          source_name?: string | null
          source_type?: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          confidence?: number
          last_checked?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      listing_equipment_specs: {
        Row: {
          id: string
          listing_id: string
          equipment_spec_id: string | null
          seller_id: string | null
          brand: string
          model: string
          serial_number: string | null
          gc_number: string | null
          category: string
          spec_plate_image_url: string | null
          ocr_text: string | null
          seller_height_cm: number | null
          seller_width_cm: number | null
          seller_depth_cm: number | null
          seller_weight_kg: number | null
          seller_forklift_required: boolean | null
          seller_condition_notes: string | null
          power_type: string | null
          voltage: string | null
          phase: number | null
          current_a: number | null
          gas_type: string | null
          gas_connection: string | null
          source_url: string | null
          source_name: string | null
          source_type: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          confidence: number
          verification_status: string
          moderation_notes: string | null
          conflict_details: string | null
          last_checked: string | null
          reported_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          equipment_spec_id?: string | null
          seller_id?: string | null
          brand: string
          model: string
          serial_number?: string | null
          gc_number?: string | null
          category: string
          spec_plate_image_url?: string | null
          ocr_text?: string | null
          seller_height_cm?: number | null
          seller_width_cm?: number | null
          seller_depth_cm?: number | null
          seller_weight_kg?: number | null
          seller_forklift_required?: boolean | null
          seller_condition_notes?: string | null
          power_type?: string | null
          voltage?: string | null
          phase?: number | null
          current_a?: number | null
          gas_type?: string | null
          gas_connection?: string | null
          source_url?: string | null
          source_name?: string | null
          source_type?: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          confidence?: number
          verification_status?: string
          moderation_notes?: string | null
          conflict_details?: string | null
          last_checked?: string | null
          reported_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          equipment_spec_id?: string | null
          seller_id?: string | null
          brand?: string
          model?: string
          serial_number?: string | null
          gc_number?: string | null
          category?: string
          spec_plate_image_url?: string | null
          ocr_text?: string | null
          seller_height_cm?: number | null
          seller_width_cm?: number | null
          seller_depth_cm?: number | null
          seller_weight_kg?: number | null
          seller_forklift_required?: boolean | null
          seller_condition_notes?: string | null
          power_type?: string | null
          voltage?: string | null
          phase?: number | null
          current_a?: number | null
          gas_type?: string | null
          gas_connection?: string | null
          source_url?: string | null
          source_name?: string | null
          source_type?: "Manufacturer" | "Dealer" | "Catalog" | "Other"
          confidence?: number
          verification_status?: string
          moderation_notes?: string | null
          conflict_details?: string | null
          last_checked?: string | null
          reported_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_spec_reports: {
        Row: {
          id: string
          equipment_spec_id: string | null
          listing_id: string | null
          reporter_id: string | null
          reason: string
          details: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          equipment_spec_id?: string | null
          listing_id?: string | null
          reporter_id?: string | null
          reason: string
          details?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          equipment_spec_id?: string | null
          listing_id?: string | null
          reporter_id?: string | null
          reason?: string
          details?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_spec_jobs: {
        Row: {
          id: string
          listing_id: string | null
          equipment_spec_id: string | null
          job_type: string
          status: string
          attempts: number
          run_after: string
          locked_at: string | null
          error: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id?: string | null
          equipment_spec_id?: string | null
          job_type?: string
          status?: string
          attempts?: number
          run_after?: string
          locked_at?: string | null
          error?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string | null
          equipment_spec_id?: string | null
          job_type?: string
          status?: string
          attempts?: number
          run_after?: string
          locked_at?: string | null
          error?: string | null
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
