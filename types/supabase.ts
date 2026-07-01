export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          category: string
          target_keywords: string[] | null
          meta_title: string
          meta_description: string
          article_html: string | null
          article_markdown: string | null
          image_prompt: string | null
          cta: string | null
          source_title: string | null
          source_url: string | null
          facebook_post: string | null
          linkedin_post: string | null
          x_post: string | null
          instagram_caption: string | null
          status: string
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          category: string
          target_keywords?: string[] | null
          meta_title: string
          meta_description: string
          article_html?: string | null
          article_markdown?: string | null
          image_prompt?: string | null
          cta?: string | null
          source_title?: string | null
          source_url?: string | null
          facebook_post?: string | null
          linkedin_post?: string | null
          x_post?: string | null
          instagram_caption?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          category?: string
          target_keywords?: string[] | null
          meta_title?: string
          meta_description?: string
          article_html?: string | null
          article_markdown?: string | null
          image_prompt?: string | null
          cta?: string | null
          source_title?: string | null
          source_url?: string | null
          facebook_post?: string | null
          linkedin_post?: string | null
          x_post?: string | null
          instagram_caption?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          full_name: string | null
          business: string | null
          business_name: string | null
          account_type: string
          location: string | null
          phone: string | null
          phone_number: string | null
          seller_contact_name: string | null
          collection_full_address: string | null
          collection_city: string | null
          collection_postcode: string | null
          avatar_url: string | null
          verified: boolean
          email_verified: boolean
          is_email_verified: boolean
          verification_level: string
          badge: string
          verified_user_badge: boolean
          auth_provider: string | null
          auth_providers: Json
          last_login_at: string | null
          phone_verified: boolean
          is_phone_verified: boolean
          phone_verified_at: string | null
          phone_verification_method: string | null
          phone_verification_status: string | null
          phone_verification_code: string | null
          phone_verification_expires_at: string | null
          phone_verification_attempts: number
          role: string
          verified_dealer: boolean
          stripe_connect_onboarding_complete: boolean
          stripe_identity_session_id: string | null
          stripe_identity_status: string | null
          government_id_verified: boolean
          business_verified: boolean
          companies_house_number: string | null
          vat_number: string | null
          trust_notes: string | null
          seller_verification_level: string
          created_at: string | null
          updated_at: string | null
          deletion_scheduled_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          full_name?: string | null
          business?: string | null
          business_name?: string | null
          account_type?: string
          location?: string | null
          phone?: string | null
          phone_number?: string | null
          seller_contact_name?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          collection_postcode?: string | null
          avatar_url?: string | null
          verified?: boolean
          email_verified?: boolean
          is_email_verified?: boolean
          verification_level?: string
          badge?: string
          verified_user_badge?: boolean
          auth_provider?: string | null
          auth_providers?: Json
          last_login_at?: string | null
          phone_verified?: boolean
          is_phone_verified?: boolean
          phone_verified_at?: string | null
          phone_verification_method?: string | null
          phone_verification_status?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verification_attempts?: number
          role?: string
          verified_dealer?: boolean
          stripe_connect_onboarding_complete?: boolean
          stripe_identity_session_id?: string | null
          stripe_identity_status?: string | null
          government_id_verified?: boolean
          business_verified?: boolean
          companies_house_number?: string | null
          vat_number?: string | null
          trust_notes?: string | null
          seller_verification_level?: string
          created_at?: string | null
          updated_at?: string | null
          deletion_scheduled_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          full_name?: string | null
          business?: string | null
          business_name?: string | null
          account_type?: string
          location?: string | null
          phone?: string | null
          phone_number?: string | null
          seller_contact_name?: string | null
          collection_full_address?: string | null
          collection_city?: string | null
          collection_postcode?: string | null
          avatar_url?: string | null
          verified?: boolean
          email_verified?: boolean
          is_email_verified?: boolean
          verification_level?: string
          badge?: string
          verified_user_badge?: boolean
          auth_provider?: string | null
          auth_providers?: Json
          last_login_at?: string | null
          phone_verified?: boolean
          is_phone_verified?: boolean
          phone_verified_at?: string | null
          phone_verification_method?: string | null
          phone_verification_status?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verification_attempts?: number
          role?: string
          verified_dealer?: boolean
          stripe_connect_onboarding_complete?: boolean
          stripe_identity_session_id?: string | null
          stripe_identity_status?: string | null
          government_id_verified?: boolean
          business_verified?: boolean
          companies_house_number?: string | null
          vat_number?: string | null
          trust_notes?: string | null
          seller_verification_level?: string
          created_at?: string | null
          updated_at?: string | null
          deletion_scheduled_at?: string | null
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
      user_verifications: {
        Row: {
          id: string
          user_id: string
          email_verified: boolean
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          id_verification_provider: string | null
          id_verification_status: string
          id_verified: boolean
          id_verified_at: string | null
          business_name: string | null
          companies_house_number: string | null
          vat_number: string | null
          business_verification_status: string
          business_verified: boolean
          business_verified_at: string | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_complete: boolean
          verification_consent_at: string | null
          verification_consent_version: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_verified?: boolean
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          id_verification_provider?: string | null
          id_verification_status?: string
          id_verified?: boolean
          id_verified_at?: string | null
          business_name?: string | null
          companies_house_number?: string | null
          vat_number?: string | null
          business_verification_status?: string
          business_verified?: boolean
          business_verified_at?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean
          verification_consent_at?: string | null
          verification_consent_version?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_verified?: boolean
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          id_verification_provider?: string | null
          id_verification_status?: string
          id_verified?: boolean
          id_verified_at?: string | null
          business_name?: string | null
          companies_house_number?: string | null
          vat_number?: string | null
          business_verification_status?: string
          business_verified?: boolean
          business_verified_at?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean
          verification_consent_at?: string | null
          verification_consent_version?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      auth_login_events: {
        Row: {
          id: string
          user_id: string | null
          provider: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          provider: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          provider?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
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
          delivery_provider: string | null
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
          pallet_size: string | null
          pallet_count: number | null
          pallet_ready: boolean | null
          tail_lift_required: boolean | null
          forklift_available: boolean | null
          ground_floor_collection: boolean | null
          commercial_premises: boolean | null
          shrink_wrapped_confirmed: boolean | null
          pallet_preparation_confirmed: boolean | null
          delivery_available: boolean | null
          caterbids_delivery_available: boolean | null
          collection_enabled: boolean | null
          buyer_arranges_enabled: boolean | null
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
          caterbot_admin_verified: boolean | null
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
          featured: boolean | null
          is_featured: boolean | null
          featured_until: string | null
          featured_type: string | null
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
          delivery_provider?: string | null
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
          pallet_size?: string | null
          pallet_count?: number | null
          pallet_ready?: boolean | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          ground_floor_collection?: boolean | null
          commercial_premises?: boolean | null
          shrink_wrapped_confirmed?: boolean | null
          pallet_preparation_confirmed?: boolean | null
          delivery_available?: boolean | null
          caterbids_delivery_available?: boolean | null
          collection_enabled?: boolean | null
          buyer_arranges_enabled?: boolean | null
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
          caterbot_admin_verified?: boolean | null
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
          featured?: boolean | null
          is_featured?: boolean | null
          featured_until?: string | null
          featured_type?: string | null
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
          delivery_provider?: string | null
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
          pallet_size?: string | null
          pallet_count?: number | null
          pallet_ready?: boolean | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          ground_floor_collection?: boolean | null
          commercial_premises?: boolean | null
          shrink_wrapped_confirmed?: boolean | null
          pallet_preparation_confirmed?: boolean | null
          delivery_available?: boolean | null
          caterbids_delivery_available?: boolean | null
          collection_enabled?: boolean | null
          buyer_arranges_enabled?: boolean | null
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
          caterbot_admin_verified?: boolean | null
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
          featured?: boolean | null
          is_featured?: boolean | null
          featured_until?: string | null
          featured_type?: string | null
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
          delivery_method: string | null
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
          pallet_size: string | null
          pallet_ready: boolean | null
          pallet_weight_kg: number | null
          pallet_length_cm: number | null
          pallet_width_cm: number | null
          pallet_height_cm: number | null
          pallet_count: number | null
          tail_lift_required: boolean | null
          forklift_available: boolean | null
          commercial_premises: boolean | null
          shrink_wrapped_confirmed: boolean | null
          pallet_preparation_confirmed: boolean | null
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
          delivery_method?: string | null
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
          pallet_size?: string | null
          pallet_ready?: boolean | null
          pallet_weight_kg?: number | null
          pallet_length_cm?: number | null
          pallet_width_cm?: number | null
          pallet_height_cm?: number | null
          pallet_count?: number | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          commercial_premises?: boolean | null
          shrink_wrapped_confirmed?: boolean | null
          pallet_preparation_confirmed?: boolean | null
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
          delivery_method?: string | null
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
          pallet_size?: string | null
          pallet_ready?: boolean | null
          pallet_weight_kg?: number | null
          pallet_length_cm?: number | null
          pallet_width_cm?: number | null
          pallet_height_cm?: number | null
          pallet_count?: number | null
          tail_lift_required?: boolean | null
          forklift_available?: boolean | null
          commercial_premises?: boolean | null
          shrink_wrapped_confirmed?: boolean | null
          pallet_preparation_confirmed?: boolean | null
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
      seller_reviews: {
        Row: {
          id: string
          order_id: string
          listing_id: string | null
          seller_id: string
          buyer_id: string
          overall_rating: number
          communication_rating: number
          item_accuracy_rating: number
          delivery_rating: number
          review_text: string | null
          verified_purchase: boolean
          seller_reply: string | null
          moderation_status: string
          flagged: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          listing_id?: string | null
          seller_id: string
          buyer_id: string
          overall_rating: number
          communication_rating: number
          item_accuracy_rating: number
          delivery_rating: number
          review_text?: string | null
          verified_purchase?: boolean
          seller_reply?: string | null
          moderation_status?: string
          flagged?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          listing_id?: string | null
          seller_id?: string
          buyer_id?: string
          overall_rating?: number
          communication_rating?: number
          item_accuracy_rating?: number
          delivery_rating?: number
          review_text?: string | null
          verified_purchase?: boolean
          seller_reply?: string | null
          moderation_status?: string
          flagged?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      seller_listing_entitlements: {
        Row: {
          id: string
          seller_id: string
          plan_id: string | null
          plan_name: string
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          listing_count_total: number
          listing_count_used: number
          monthly: boolean
          starts_at: string
          expires_at: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          plan_id?: string | null
          plan_name: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          listing_count_total?: number
          listing_count_used?: number
          monthly?: boolean
          starts_at?: string
          expires_at?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          plan_id?: string | null
          plan_name?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          listing_count_total?: number
          listing_count_used?: number
          monthly?: boolean
          starts_at?: string
          expires_at?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_listing_entitlements_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      seller_review_stats: {
        Row: {
          seller_id: string | null
          review_count: number | null
          average_rating: number | null
          communication_rating: number | null
          item_accuracy_rating: number | null
          delivery_rating: number | null
        }
        Relationships: []
      }
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
