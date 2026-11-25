import type { AuditContext, Check, CheckResult } from '../types'
import { AI_CHECKS } from './ai'
import type { CheckMeta, DefinedCheck } from './define'
import { SEO_CHECKS } from './seo'

export const ALL_CHECKS: DefinedCheck[] = [...SEO_CHECKS, ...AI_CHECKS]

/** Readable description of a check, available without running it. */
export type CheckInfo = Pick<CheckMeta, 'id' | 'category' | 'title'>

/** Every check of the engine, in `ALL_CHECKS` order (used by the landing and llms.txt). */
export const CHECK_CATALOG: CheckInfo[] = ALL_CHECKS.map(({ meta }) => ({
  id: meta.id,
  category: meta.category,
  title: meta.title,
}))

export function runChecks(ctx: AuditContext, checks: Check[] = ALL_CHECKS): CheckResult[] {
  return checks.map((check) => check(ctx))
}

export { AI_CHECKS, SEO_CHECKS }
export type { DefinedCheck }
