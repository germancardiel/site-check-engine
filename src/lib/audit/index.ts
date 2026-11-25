import { runChecks } from './checks'
import { buildAuditContext, comparableUrl, daysUntil, emptyPsi, fetchPsi, probeTls } from './context'
import { AuditFetchError, safeFetch, type AuditFetchErrorCode } from './fetcher'
import { buildCategories, scoreAudit } from './scoring'
import type { AuditOutcome, FetchDeps } from './types'

export const AUDIT_ERROR_MESSAGES: Record<AuditFetchErrorCode | 'UNKNOWN', string> = {
  INVALID_URL: 'La URL no es válida. Usa una dirección que empiece por http:// o https://.',
  BLOCKED_HOST: 'No se puede auditar esta dirección porque apunta a una red privada o no permitida.',
  TOO_MANY_REDIRECTS: 'La página tiene demasiadas redirecciones.',
  TIMEOUT: 'La página tardó demasiado en responder.',
  TOO_LARGE: 'La página es demasiado grande para auditarla (máximo 3 MB).',
  NETWORK: 'No se pudo conectar con la página. Comprueba que la dirección es correcta.',
  UNKNOWN: 'No se pudo completar la auditoría. Inténtalo de nuevo más tarde.',
}

function errorOutcome(error: unknown): AuditOutcome {
  console.error('[runAudit]', error)
  const code = error instanceof AuditFetchError ? error.code : 'UNKNOWN'
  return { status: 'error', error: AUDIT_ERROR_MESSAGES[code] }
}

/** Audits a public URL. Never throws: failures of the main page return `{ status: 'error' }`. */
export async function runAudit(url: string, deps: FetchDeps = {}): Promise<AuditOutcome> {
  try {
    const page = await safeFetch(url, deps)
    const ctx = await buildAuditContext(url, page, deps)
    const checks = runChecks(ctx)
    const categories = buildCategories(checks)
    const { score, seoScore, aiScore, label, capReason, issues } = scoreAudit(categories)
    return {
      status: 'ok',
      score,
      seoScore,
      aiScore,
      label,
      ...(capReason ? { capReason } : {}),
      checks,
      categories,
      issues,
    }
  } catch (error) {
    return errorOutcome(error)
  }
}

export { AuditFetchError, safeFetch } from './fetcher'
export { diffAudits } from './diff'
export { buildCategories, scoreAudit, scoreCheckList, scoreChecks, labelFor, BLOCKING_CAP } from './scoring'
export { buildAuditContext, comparableUrl, daysUntil, emptyPsi, fetchPsi, probeTls }
export type * from './types'
