import type { AuditContext, Check, CheckResult } from '../types'
import { AI_CHECKS } from './ai'
import { SEO_CHECKS } from './seo'

export const ALL_CHECKS: Check[] = [...SEO_CHECKS, ...AI_CHECKS]

export function runChecks(ctx: AuditContext, checks: Check[] = ALL_CHECKS): CheckResult[] {
  return checks.map((check) => check(ctx))
}

export { AI_CHECKS, SEO_CHECKS }
