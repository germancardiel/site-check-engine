import type { CheckResult } from '@/lib/audit/types'
import { AI_DAILY_LIMIT } from './config'
import {
  actionPlanSchema,
  changeSummarySchema,
  type ActionPlan,
  type ChangeSummary,
  type Effort,
  type Impact,
  type PlanAction,
} from './schemas'

export const IMPACT_LABEL: Record<Impact, string> = { alto: 'Impacto alto', medio: 'Impacto medio', bajo: 'Impacto bajo' }
export const EFFORT_LABEL: Record<Effort, string> = { bajo: 'Esfuerzo bajo', medio: 'Esfuerzo medio', alto: 'Esfuerzo alto' }

const IMPACT_RANK: Record<Impact, number> = { alto: 0, medio: 1, bajo: 2 }
const EFFORT_RANK: Record<Effort, number> = { bajo: 0, medio: 1, alto: 2 }

/** Sorts actions by impact (alto first) and, for equal impact, by effort (bajo first). Stable. */
export function sortActions(actions: PlanAction[]): PlanAction[] {
  return [...actions].sort(
    (a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] || EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort],
  )
}

/**
 * Validates an `ai_reports.content` of kind `plan` read from the database.
 * Returns `null` when it is invalid, so a bad row never breaks the page.
 */
export function parseStoredPlan(content: unknown): ActionPlan | null {
  const parsed = actionPlanSchema.safeParse(content)
  if (!parsed.success) return null
  return { ...parsed.data, actions: sortActions(parsed.data.actions) }
}

/** Validates an `ai_reports.content` of kind `changes`; `null` when invalid. */
export function parseStoredChanges(content: unknown): ChangeSummary | null {
  const parsed = changeSummarySchema.safeParse(content)
  return parsed.success ? parsed.data : null
}

export type CheckLink = { id: string; title: string }

/** Resolves the `checkIds` of an action to the audit's checks, dropping unknown or repeated ids. */
export function resolveCheckLinks(checkIds: string[], checks: Pick<CheckResult, 'id' | 'title'>[]): CheckLink[] {
  const byId = new Map(checks.map((check) => [check.id, check.title]))
  const unique = [...new Set(checkIds)]
  return unique.flatMap((id) => {
    const title = byId.get(id)
    return title === undefined ? [] : [{ id, title }]
  })
}

/** Calendar day (YYYY-MM-DD) in Europe/Madrid, the same day used by `consume_ai_quota`. */
export function madridDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Generations left today given the stored counter (missing row = none used). */
export function remainingGenerations(used: number | null | undefined, limit = AI_DAILY_LIMIT): number {
  return Math.max(0, Math.min(limit, limit - (used ?? 0)))
}

export function quotaLabel(remaining: number): string {
  return remaining === 1 ? 'Te queda 1 generación hoy.' : `Te quedan ${remaining} generaciones hoy.`
}

/** Why the AI buttons are disabled when today's generations are used up (D-UX-11). */
export const AI_QUOTA_EXHAUSTED_MESSAGE = `Has usado las ${AI_DAILY_LIMIT} generaciones de hoy; se renuevan a medianoche (hora de Madrid).`

export type StoredReport<T> =
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'ok'; data: T; createdAt: string }

export type ReportRow = { kind: string; content: unknown; created_at: string }

export type AuditReports = {
  plan: StoredReport<ActionPlan>
  changes: StoredReport<ChangeSummary>
}

function toStored<T>(row: ReportRow | undefined, parse: (content: unknown) => T | null): StoredReport<T> {
  if (!row) return { status: 'none' }
  const data = parse(row.content)
  return data === null ? { status: 'invalid' } : { status: 'ok', data, createdAt: row.created_at }
}

/** Turns the `ai_reports` rows of an audit into view data; invalid content becomes `invalid`, never an exception. */
export function readAuditReports(rows: ReportRow[]): AuditReports {
  return {
    plan: toStored(rows.find((row) => row.kind === 'plan'), parseStoredPlan),
    changes: toStored(rows.find((row) => row.kind === 'changes'), parseStoredChanges),
  }
}
