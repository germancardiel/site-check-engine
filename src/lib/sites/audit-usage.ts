import { madridDay } from '@/lib/ai/reports'
import type { createClient } from '@/lib/supabase/server'
import { remainingAudits } from './audit-availability'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Audits the user can still start today (Europe/Madrid), read from `audit_usage` (T16).
 * Returns `null` when the counter cannot be read: the page still renders and the database
 * keeps enforcing the limit.
 */
export async function loadRemainingAudits(supabase: Supabase, userId: string, now: Date): Promise<number | null> {
  const { data, error } = await supabase
    .from('audit_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('day', madridDay(now))
    .maybeSingle()
  if (error) {
    console.error('[loadRemainingAudits]', error)
    return null
  }
  return remainingAudits(data?.count)
}
