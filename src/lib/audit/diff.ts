import type { CheckResult, CheckStatus } from './types'

/** Order used to decide whether a check improved: fail < warn < pass. */
export const STATUS_RANK: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 }

type DiffableCheck = Pick<CheckResult, 'id' | 'category' | 'title' | 'status'>

export type AuditSnapshot = {
  score: number | null
  seoScore: number | null
  aiScore: number | null
  checks: DiffableCheck[]
}

export type CheckChange = Omit<DiffableCheck, 'status'> & {
  from: CheckStatus | null
  to: CheckStatus | null
}

export type AuditDiff = {
  scoreDelta: number | null
  seoDelta: number | null
  aiDelta: number | null
  improved: CheckChange[]
  regressed: CheckChange[]
  unchanged: CheckChange[]
  added: CheckChange[]
  removed: CheckChange[]
}

function delta(prev: number | null, curr: number | null): number | null {
  return prev === null || curr === null ? null : curr - prev
}

function change(check: DiffableCheck, from: CheckStatus | null, to: CheckStatus | null): CheckChange {
  return { id: check.id, category: check.category, title: check.title, from, to }
}

/** Compares two audits check by check (matched by `id`). Deltas are `curr - prev`. */
export function diffAudits(prev: AuditSnapshot, curr: AuditSnapshot): AuditDiff {
  const previous = new Map(prev.checks.map((check) => [check.id, check]))
  const currentIds = new Set(curr.checks.map((check) => check.id))
  const result: AuditDiff = {
    scoreDelta: delta(prev.score, curr.score),
    seoDelta: delta(prev.seoScore, curr.seoScore),
    aiDelta: delta(prev.aiScore, curr.aiScore),
    improved: [],
    regressed: [],
    unchanged: [],
    added: [],
    removed: [],
  }
  for (const check of curr.checks) {
    const before = previous.get(check.id)
    if (!before) {
      result.added.push(change(check, null, check.status))
      continue
    }
    const diff = STATUS_RANK[check.status] - STATUS_RANK[before.status]
    const bucket = diff > 0 ? result.improved : diff < 0 ? result.regressed : result.unchanged
    bucket.push(change(check, before.status, check.status))
  }
  for (const check of prev.checks) {
    if (!currentIds.has(check.id)) result.removed.push(change(check, check.status, null))
  }
  return result
}
