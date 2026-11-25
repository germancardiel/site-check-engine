import { CATEGORIES } from './categories'
import type {
  AuditIssue,
  CategoryResult,
  CheckResult,
  CheckStatus,
  ScoreLabel,
  Scores,
} from './types'

export const STATUS_VALUE: Partial<Record<CheckStatus, number>> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
}

export const isEvaluable = (s: CheckStatus): boolean => s in STATUS_VALUE
export const isIssue = (s: CheckStatus): s is 'warn' | 'fail' => s === 'warn' || s === 'fail'

const round1 = (n: number): number => Math.round(n * 10) / 10

export type ScorableCheck = Pick<CheckResult, 'status' | 'weight'> &
  Partial<Pick<CheckResult, 'id' | 'category' | 'title'>>

/** Puntuación 0–100 de un conjunto de checks; null si ninguno es evaluable. */
export function scoreCheckList(checks: ScorableCheck[]): number | null {
  let total = 0
  let max = 0
  for (const c of checks) {
    if (c.weight <= 0) continue
    const v = STATUS_VALUE[c.status]
    if (v === undefined) continue
    total += v * c.weight
    max += c.weight
  }
  return max === 0 ? null : round1((total / max) * 100)
}

export function labelFor(score: number): ScoreLabel {
  if (score >= 90) return 'Excelente'
  if (score >= 75) return 'Bueno'
  if (score >= 50) return 'Mejorable'
  return 'Deficiente'
}

export const BLOCKING_CAP = 40
/** Checks que, si fallan, impiden que la página se indexe. */
export const BLOCKING_CHECKS: Record<string, string> = {
  'crawl.status': 'La URL no responde con un código 200',
  'crawl.robots-txt': 'La URL está bloqueada en robots.txt',
  'crawl.noindex': 'La página tiene la directiva noindex',
}

export function buildCategories(results: CheckResult[]): CategoryResult[] {
  return CATEGORIES.map((meta) => {
    const checks = results.filter((r) => r.category === meta.id)
    return {
      id: meta.id,
      title: meta.title,
      shortTitle: meta.shortTitle,
      weight: meta.weight,
      score: scoreCheckList(checks),
      issues: checks.filter((c) => isIssue(c.status)).length,
      checks,
    }
  })
}

function weightedMean(items: Array<{ score: number | null; weight: number }>): number {
  let total = 0
  let max = 0
  for (const item of items) {
    if (item.score === null) continue
    total += item.score * item.weight
    max += item.weight
  }
  return max === 0 ? 0 : round1(total / max)
}

export function scoreAudit(categories: CategoryResult[]): {
  score: number
  seoScore: number
  aiScore: number
  label: ScoreLabel
  capReason?: string
  issues: AuditIssue[]
} {
  let score = Math.round(weightedMean(categories))
  const seoCategories = categories.filter((c) => c.id !== 'ai')
  const aiCategory = categories.find((c) => c.id === 'ai')
  const seoScore = Math.round(weightedMean(seoCategories))
  const aiScore = aiCategory?.score === null || aiCategory?.score === undefined ? 0 : Math.round(aiCategory.score)

  let capReason: string | undefined
  for (const c of categories) {
    for (const check of c.checks) {
      const reason = BLOCKING_CHECKS[check.id]
      if (reason && check.status === 'fail') {
        capReason = reason
        break
      }
    }
    if (capReason) break
  }
  if (capReason) score = Math.min(score, BLOCKING_CAP)

  const issues: AuditIssue[] = categories
    .flatMap((c) =>
      c.checks
        .filter((ch) => isIssue(ch.status))
        .map((ch) => ({
          checkId: ch.id,
          category: c.id,
          categoryTitle: c.title,
          title: ch.title,
          status: ch.status as 'warn' | 'fail',
          weight: ch.weight * c.weight,
        })),
    )
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === 'fail' ? -1 : 1))

  return { score, seoScore, aiScore, label: labelFor(score), capReason, issues }
}

/** Calcula las notas `score`, `seoScore` (1–9) y `aiScore` (10) de un listado de checks. */
export function scoreChecks(
  checks: Array<Pick<CheckResult, 'category' | 'status' | 'weight'> & Partial<Pick<CheckResult, 'id' | 'title'>>>,
): Scores {
  const full: CheckResult[] = checks.map((c, i) => ({
    id: c.id ?? `check-${i}`,
    category: c.category,
    title: c.title ?? `Check ${i}`,
    status: c.status,
    weight: c.weight,
    message: '',
    recommendation: '',
    docs: [],
  }))
  const { score, seoScore, aiScore, label, capReason } = scoreAudit(buildCategories(full))
  return { score, seoScore, aiScore, label, ...(capReason ? { capReason } : {}) }
}
