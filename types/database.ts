/**
 * TypeScript types for the Phase 1 Supabase database schema.
 *
 * Hand-authored to match supabase/migrations/0001_init.sql.
 * Regenerate at any time with:
 *   npm run db:types
 *
 * Rules:
 *   - No `any` types.
 *   - Nullable columns are `T | null`.
 *   - Insert types mark server-defaulted columns optional.
 *   - Update types make all columns optional (partial update pattern).
 */

// ---------------------------------------------------------------------------
// Scalar helpers
// ---------------------------------------------------------------------------

/** Supabase-compatible recursive JSON type (no `any`). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Enum-like string unions (mirror CHECK constraints in migration)
// ---------------------------------------------------------------------------

export type UserRole = 'user' | 'agent' | 'admin'
export type UserTier = 'free' | 'pro' | 'premium'
export type Currency = 'AMD' | 'USD' | 'EUR' | 'RUB'
export type DealType = 'sale' | 'rent'
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land' | 'garage' | 'newdev'
export type ListingStatus = 'active' | 'draft' | 'pending' | 'archived' | 'sold'
export type MediaType = 'image' | 'video' | 'virtual_tour'

// ---------------------------------------------------------------------------
// Database shape (mirrors the Supabase generated-types structure so
// createBrowserClient<Database> / createServerClient<Database> work correctly)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      // ── profiles ────────────────────────────────────────────────────────
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          role: UserRole
          tier: UserTier
          bio: string | null
          website: string | null
          created_at: string
          updated_at: string
          phone_verified: boolean
          agent_slug: string | null
          agent_rating: number | null
          agent_review_count: number
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          role?: UserRole
          tier?: UserTier
          bio?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
          phone_verified?: boolean
          agent_slug?: string | null
          agent_rating?: number | null
          agent_review_count?: number
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          role?: UserRole
          tier?: UserTier
          bio?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
          phone_verified?: boolean
          agent_slug?: string | null
          agent_rating?: number | null
          agent_review_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // ── properties ──────────────────────────────────────────────────────
      properties: {
        Row: {
          id: string
          owner_id: string
          slug: string
          title: Json
          description: Json
          price: number
          currency: Currency
          area_m2: number | null
          rooms: number | null
          bedrooms: number | null
          bathrooms: number | null
          floor: number | null
          floors_total: number | null
          year_built: number | null
          property_type: PropertyType
          deal_type: DealType
          status: ListingStatus
          country: string
          region: string | null
          city: string
          district: string | null
          address: string | null
          lat: number | null
          lng: number | null
          hide_exact_address: boolean
          amenities: string[]
          condition: string | null
          heating: boolean
          balcony: boolean
          parking: boolean
          elevator: boolean
          negotiable: boolean
          utilities_included: boolean
          deposit: number | null
          min_rent_term_months: number | null
          contact_name: string | null
          contact_phone: string | null
          contact_preference: string | null
          video_url: string | null
          tour360_url: string | null
          /** PostGIS GEOGRAPHY(POINT, 4326) returned as GeoJSON string by Supabase REST */
          location: string | null
          created_at: string
          updated_at: string
          listed_at: string | null
          views_count: number
          expires_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          slug: string
          title?: Json
          description?: Json
          price: number
          currency?: Currency
          area_m2?: number | null
          rooms?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          floor?: number | null
          floors_total?: number | null
          year_built?: number | null
          property_type: PropertyType
          deal_type: DealType
          status?: ListingStatus
          country?: string
          region?: string | null
          city: string
          district?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          hide_exact_address?: boolean
          amenities?: string[]
          condition?: string | null
          heating?: boolean
          balcony?: boolean
          parking?: boolean
          elevator?: boolean
          negotiable?: boolean
          utilities_included?: boolean
          deposit?: number | null
          min_rent_term_months?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_preference?: string | null
          video_url?: string | null
          tour360_url?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
          listed_at?: string | null
          views_count?: number
          expires_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          slug?: string
          title?: Json
          description?: Json
          price?: number
          currency?: Currency
          area_m2?: number | null
          rooms?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          floor?: number | null
          floors_total?: number | null
          year_built?: number | null
          property_type?: PropertyType
          deal_type?: DealType
          status?: ListingStatus
          country?: string
          region?: string | null
          city?: string
          district?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          hide_exact_address?: boolean
          amenities?: string[]
          condition?: string | null
          heating?: boolean
          balcony?: boolean
          parking?: boolean
          elevator?: boolean
          negotiable?: boolean
          utilities_included?: boolean
          deposit?: number | null
          min_rent_term_months?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_preference?: string | null
          video_url?: string | null
          tour360_url?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
          listed_at?: string | null
          views_count?: number
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'properties_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      // ── property_media ───────────────────────────────────────────────────
      property_media: {
        Row: {
          id: string
          property_id: string
          url: string
          media_type: MediaType
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          url: string
          media_type?: MediaType
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          url?: string
          media_type?: MediaType
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'property_media_property_id_fkey'
            columns: ['property_id']
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
      }

      // ── favorites ────────────────────────────────────────────────────────
      favorites: {
        Row: {
          id: string
          user_id: string
          property_id: string
          /** Price of the property at the moment the favorite was saved. */
          saved_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          saved_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          saved_price?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_property_id_fkey'
            columns: ['property_id']
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
      }

      // ── conversations ────────────────────────────────────────────────────
      conversations: {
        Row: {
          id: string
          property_id: string | null
          buyer_id: string
          seller_id: string
          archived: boolean
          muted: boolean
          blocked_by: string | null
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          buyer_id: string
          seller_id: string
          archived?: boolean
          muted?: boolean
          blocked_by?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          buyer_id?: string
          seller_id?: string
          archived?: boolean
          muted?: boolean
          blocked_by?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_property_id_fkey'
            columns: ['property_id']
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_buyer_id_fkey'
            columns: ['buyer_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_seller_id_fkey'
            columns: ['seller_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      // ── messages ─────────────────────────────────────────────────────────
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          attachments: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          attachments?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          body?: string
          attachments?: Json
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      // ── blocks ───────────────────────────────────────────────────────────
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blocks_blocker_id_fkey'
            columns: ['blocker_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocked_id_fkey'
            columns: ['blocked_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }

      // ── reports ──────────────────────────────────────────────────────────
      reports: {
        Row: {
          id: string
          reporter_id: string
          conversation_id: string | null
          reason: string
          note: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          conversation_id?: string | null
          reason: string
          note?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          conversation_id?: string | null
          reason?: string
          note?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey'
            columns: ['reporter_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_conversation_id_fkey'
            columns: ['conversation_id']
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }

      // ── notifications ─────────────────────────────────────────────────────
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          is_read: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
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

// ---------------------------------------------------------------------------
// Convenience aliases (mirror what `supabase gen types typescript` emits)
// ---------------------------------------------------------------------------

/** Extract the Row type for a given table. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Extract the Insert type for a given table. */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Extract the Update type for a given table. */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
