import { z } from 'zod'
import { CATEGORY_IDS } from '@/lib/audit/categories'
import { deriveRecommendation } from '@/lib/audit/checks'
import type { CategoryId, CheckResult } from '@/lib/audit/types'

/** True only for absolute `http:`/`https:` URLs (D-SEC-12: these end up in `href`). */
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const docLinkSchema = z.object({
  label: z.string(),
  url: z.string().refine(isHttpUrl),
})

/** Keeps the valid doc links and drops the rest, so one bad link does not invalidate the audit. */
const docLinksSchema = z.array(z.unknown()).transform((items) =>
  items.flatMap((item) => {
    const parsed = docLinkSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  }),
)

const evidenceItemSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  status: z.enum(['ok', 'bad', 'neutral']).optional(),
})

const rawCheckResultSchema = z.object({
  id: z.string().min(1),
  category: z.enum([...CATEGORY_IDS, 'seo']),
  title: z.string(),
  status: z.enum(['pass', 'warn', 'fail', 'na', 'error']),
  weight: z.number().finite().nonnegative(),
  message: z.string(),
  evidence: z.string().optional(),
  items: z.array(evidenceItemSchema).optional(),
  fix: z.string().optional(),
  docs: docLinksSchema.optional(),
  recommendation: z.string().optional(),
})

const checkResultSchema = rawCheckResultSchema.transform((raw): CheckResult => {
  const category: CategoryId = raw.category === 'seo' ? 'crawl' : raw.category
  const docs = raw.docs ?? []
  const recommendation =
    raw.recommendation ??
    deriveRecommendation({
      status: raw.status,
      message: raw.message,
      fix: raw.fix,
    })
  return {
    id: raw.id,
    category,
    title: raw.title,
    status: raw.status,
    weight: raw.weight,
    message: raw.message,
    ...(raw.evidence !== undefined ? { evidence: raw.evidence } : {}),
    ...(raw.items !== undefined ? { items: raw.items } : {}),
    ...(raw.fix !== undefined ? { fix: raw.fix } : {}),
    docs,
    recommendation,
  }
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
