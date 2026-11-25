import { z } from 'zod'
import type { CheckResult } from '@/lib/audit/types'

const checkResultSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['seo', 'ai']),
  title: z.string(),
  status: z.enum(['pass', 'warn', 'fail']),
  weight: z.number().finite().nonnegative(),
  message: z.string(),
  recommendation: z.string(),
})

/** Shape of the `audits.checks` jsonb column: the engine's `CheckResult[]`. */
export const checksSchema = z.array(checkResultSchema)

export type ParsedChecks = { ok: true; checks: CheckResult[] } | { ok: false; error: z.ZodError }

/** Validates the `checks` jsonb read from the database before using it. */
export function parseChecks(value: unknown): ParsedChecks {
  const parsed = checksSchema.safeParse(value)
  return parsed.success ? { ok: true, checks: parsed.data } : { ok: false, error: parsed.error }
}

/** Route params of `/sitios/[siteId]/auditorias/[auditId]`. */
export const auditRouteParamsSchema = z.object({
  siteId: z.uuid(),
  auditId: z.uuid(),
})

/**
 * Reads `?comparar=<auditId>`: returns the id only when it is a single valid uuid
 * different from the audit being shown; anything else is ignored (`null`).
 */
export function parseCompareParam(value: unknown, currentAuditId: string): string | null {
  const parsed = z.uuid().safeParse(value)
  if (!parsed.success || parsed.data === currentAuditId) return null
  return parsed.data
}
