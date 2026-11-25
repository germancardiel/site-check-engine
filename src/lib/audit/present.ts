import type { AuditStatus } from '@/lib/supabase/types'
import type { CheckInfo } from './checks'
import { STATUS_RANK, type AuditDiff } from './diff'
import type { CheckCategory, CheckResult, CheckStatus } from './types'

/** Text shown next to each status icon, so the status never depends on color alone. */
export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  fail: 'Falla',
  warn: 'Mejorable',
  pass: 'Correcto',
}

export const CHECK_CATEGORY_LABEL: Record<CheckCategory, string> = {
  seo: 'SEO',
  ai: 'Visibilidad en IA',
}

export type CheckGroup = {
  category: CheckCategory
  title: string
  /** `fail` first, then `warn`. */
  pending: CheckResult[]
  passed: CheckResult[]
}

const CATEGORY_ORDER: CheckCategory[] = ['seo', 'ai']

/** Sorts checks `fail` → `warn` → `pass`, keeping the original order within each status. */
export function sortChecks(checks: CheckResult[]): CheckResult[] {
  return [...checks].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])
}

/** Groups checks into the SEO and IA sections, each sorted and split into pending and passed. */
export function groupChecks(checks: CheckResult[]): CheckGroup[] {
  return CATEGORY_ORDER.map((category) => {
    const sorted = sortChecks(checks.filter((check) => check.category === category))
    return {
      category,
      title: CHECK_CATEGORY_LABEL[category],
      pending: sorted.filter((check) => check.status !== 'pass'),
      passed: sorted.filter((check) => check.status === 'pass'),
    }
  })
}

export type CheckPriority = {
  /** `fail` first, then `warn`, across both categories. */
  pending: CheckResult[]
  passed: CheckResult[]
}

/** Splits checks into what to fix first (`fail` → `warn`, SEO and IA together) and what passed. */
export function prioritizeChecks(checks: CheckResult[]): CheckPriority {
  const sorted = sortChecks(checks)
  return {
    pending: sorted.filter((check) => check.status !== 'pass'),
    passed: sorted.filter((check) => check.status === 'pass'),
  }
}

export type CatalogGroup<T extends CheckInfo = CheckInfo> = { category: CheckCategory; title: string; checks: T[] }

/** Splits the check catalog into the SEO and IA sections, keeping the catalog order. */
export function groupCatalog<T extends CheckInfo>(catalog: T[]): CatalogGroup<T>[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    title: CHECK_CATEGORY_LABEL[category],
    checks: catalog.filter((check) => check.category === category),
  }))
}

/** Minimal columns needed to decide which audit to compare against. */
export type ComparisonCandidate = {
  id: string
  site_id: string
  status: AuditStatus
  created_at: string
}

export type ComparisonTarget<T extends ComparisonCandidate> = {
  audit: T
  source: 'requested' | 'previous'
}

function isValidTarget(candidate: ComparisonCandidate | null, current: ComparisonCandidate): boolean {
  return (
    candidate !== null &&
    candidate.id !== current.id &&
    candidate.site_id === current.site_id &&
    candidate.status === 'ok'
  )
}

function isOlder(candidate: ComparisonCandidate, current: ComparisonCandidate): boolean {
  return new Date(candidate.created_at).getTime() < new Date(current.created_at).getTime()
}

/**
 * Picks the audit to compare with: the one requested via `?comparar` when it is an `ok`
 * audit of the same site; otherwise the previous `ok` audit (if any).
 */
export function resolveComparisonTarget<T extends ComparisonCandidate>(
  current: ComparisonCandidate,
  requested: T | null,
  previous: T | null,
): ComparisonTarget<T> | null {
  if (requested && isValidTarget(requested, current)) return { audit: requested, source: 'requested' }
  if (previous && isValidTarget(previous, current) && isOlder(previous, current)) {
    return { audit: previous, source: 'previous' }
  }
  return null
}

/** Whether any check changed status, appeared or disappeared between the two audits. */
export function hasCheckChanges(diff: AuditDiff): boolean {
  return diff.improved.length + diff.regressed.length + diff.added.length + diff.removed.length > 0
}

/** Fragment id of a check in the audit detail page, used by the AI plan to link to it. */
export function checkAnchorId(checkId: string): string {
  return `check-${checkId.replace(/[^A-Za-z0-9_-]/g, '-')}`
}
