import type { CheckCategory, CheckResult, CheckStatus, Scores } from './types'

export const STATUS_VALUE: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 }

type ScorableCheck = Pick<CheckResult, 'category' | 'status' | 'weight'>

/** Weighted mean (0–100, rounded) of one category. A category without checks scores 0. */
export function categoryScore(checks: ScorableCheck[], category: CheckCategory): number {
  const inCategory = checks.filter((check) => check.category === category && check.weight > 0)
  const totalWeight = inCategory.reduce((sum, check) => sum + check.weight, 0)
  if (totalWeight === 0) return 0
  const earned = inCategory.reduce((sum, check) => sum + check.weight * STATUS_VALUE[check.status], 0)
  return Math.round((earned / totalWeight) * 100)
}

/** `score` is the rounded mean of the SEO and AI category scores. */
export function scoreChecks(checks: ScorableCheck[]): Scores {
  const seoScore = categoryScore(checks, 'seo')
  const aiScore = categoryScore(checks, 'ai')
  return { score: Math.round((seoScore + aiScore) / 2), seoScore, aiScore }
}
