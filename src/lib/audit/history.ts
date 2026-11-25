import type { AuditStatus } from '@/lib/supabase/types'

/** Columns of `audits` used by the history list and the chart (never `checks`). */
export type HistoryAudit = {
  id: string
  status: AuditStatus
  score: number | null
  seo_score: number | null
  ai_score: number | null
  error: string | null
  created_at: string
}

export type HistoryEntry = HistoryAudit & {
  /** Change of the total score versus the previous `ok` audit; `null` if not computable. */
  scoreDelta: number | null
}

export const HISTORY_LIMIT = 30

/**
 * Adds to each audit the change of its total score against the previous `ok` audit.
 * `audits` must be ordered newest first. Failed audits get `null` and are skipped
 * when looking for the previous `ok` audit. Pass `limit + 1` rows so the oldest
 * visible audit still has its reference; the result is cut to `limit`.
 */
export function buildHistory(audits: HistoryAudit[], limit: number = HISTORY_LIMIT): HistoryEntry[] {
  const entries: HistoryEntry[] = []
  let previousScore: number | null = null
  for (let index = audits.length - 1; index >= 0; index -= 1) {
    const audit = audits[index]
    const score = audit.status === 'ok' ? audit.score : null
    const scoreDelta = score !== null && previousScore !== null ? score - previousScore : null
    if (score !== null) previousScore = score
    entries.push({ ...audit, scoreDelta })
  }
  return entries.reverse().slice(0, limit)
}

export type DeltaTrend = 'up' | 'down' | 'same'

export type FormattedDelta = {
  /** Visible text, e.g. "+7", "−3" (with U+2212) or "0". */
  text: string
  /** Accessible description, e.g. "sube 7 puntos". */
  label: string
  trend: DeltaTrend
}

function points(value: number): string {
  return value === 1 ? '1 punto' : `${value} puntos`
}

/** Formats a score change with a sign and an accessible text that does not rely on color. */
export function formatScoreDelta(delta: number | null): FormattedDelta | null {
  if (delta === null) return null
  if (delta > 0) return { text: `+${delta}`, label: `sube ${points(delta)}`, trend: 'up' }
  if (delta < 0) return { text: `−${-delta}`, label: `baja ${points(-delta)}`, trend: 'down' }
  return { text: '0', label: 'sin cambios', trend: 'same' }
}
