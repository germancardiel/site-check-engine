/**
 * Database types written by hand. Keep in sync with `supabase/migrations/`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AuditStatus = 'ok' | 'error'

export type Database = {
  public: {
    Tables: {
      sites: {
        Row: {
          id: string
          user_id: string
          url: string
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          url: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audits: {
        Row: {
          id: string
          site_id: string
          user_id: string
          status: AuditStatus
          score: number | null
          seo_score: number | null
          ai_score: number | null
          checks: Json
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          user_id?: string
          status: AuditStatus
          score?: number | null
          seo_score?: number | null
          ai_score?: number | null
          checks?: Json
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          user_id?: string
          status?: AuditStatus
          score?: number | null
          seo_score?: number | null
          ai_score?: number | null
          checks?: Json
          error?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audits_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
