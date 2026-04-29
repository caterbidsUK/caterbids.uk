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

