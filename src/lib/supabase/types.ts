/**
 * Database types written by hand. Keep in sync with `supabase/migrations/`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AuditStatus = 'ok' | 'error'

export type AiReportKind = 'plan' | 'changes'

/** Result of the `start_audit` RPC. */
export type StartAuditResult = 'ok' | 'quota' | 'cooldown' | 'not_found'

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
          last_audit_started_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          url: string
          name?: string | null
          created_at?: string
          last_audit_started_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          name?: string | null
          created_at?: string
          last_audit_started_at?: string | null
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
      ai_reports: {
        Row: {
          id: string
          audit_id: string
          user_id: string
          kind: AiReportKind
          content: Json
          model: string
          created_at: string
        }
        Insert: {
          id?: string
          audit_id: string
          user_id?: string
          kind: AiReportKind
          content: Json
          model: string
          created_at?: string
        }
        Update: {
          id?: string
          audit_id?: string
          user_id?: string
          kind?: AiReportKind
          content?: Json
          model?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_reports_audit_id_fkey'
            columns: ['audit_id']
            isOneToOne: false
            referencedRelation: 'audits'
            referencedColumns: ['id']
          },
        ]
      }
      ai_usage: {
        Row: {
          user_id: string
          day: string
          count: number
          refunds: number
        }
        Insert: {
          user_id: string
          day: string
          count?: number
          refunds?: number
        }
        Update: {
          user_id?: string
          day?: string
          count?: number
          refunds?: number
        }
        Relationships: []
      }
      audit_usage: {
        Row: {
          user_id: string
          day: string
          count: number
        }
        Insert: {
          user_id: string
          day: string
          count?: number
        }
        Update: {
          user_id?: string
          day?: string
          count?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      consume_ai_quota: {
        Args: { p_limit: number }
        Returns: number
      }
      refund_ai_quota: {
        Args: never
        Returns: undefined
      }
      /** Superseded by `start_audit` (T16); `authenticated` can no longer execute it. */
      claim_audit_slot: {
        Args: { p_site_id: string }
        Returns: boolean
      }
      start_audit: {
        Args: { p_site_id: string; p_limit: number }
        Returns: StartAuditResult
      }
    }
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
