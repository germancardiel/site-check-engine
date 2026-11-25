import { runChecks } from './checks'
import { AuditFetchError, safeFetch, type AuditFetchErrorCode } from './fetcher'
import { looksLikeHtml, parseHtml } from './parse'
import { parseRobots } from './robots'
import { scoreChecks } from './scoring'
import type { AuditContext, AuditOutcome, FetchDeps } from './types'

export const AUDIT_ERROR_MESSAGES: Record<AuditFetchErrorCode | 'UNKNOWN', string> = {
  INVALID_URL: 'La URL no es válida. Usa una dirección que empiece por http:// o https://.',
  BLOCKED_HOST: 'No se puede auditar esta dirección porque apunta a una red privada o no permitida.',
  TOO_MANY_REDIRECTS: 'La página tiene demasiadas redirecciones.',
  TIMEOUT: 'La página tardó demasiado en responder.',
  TOO_LARGE: 'La página es demasiado grande para auditarla (máximo 3 MB).',
  NETWORK: 'No se pudo conectar con la página. Comprueba que la dirección es correcta.',
  UNKNOWN: 'No se pudo completar la auditoría. Inténtalo de nuevo más tarde.',
}

/** Fetches an auxiliary text file; any failure, non-200 or HTML shell counts as missing. */
async function fetchAuxText(url: string, deps: FetchDeps): Promise<string | null> {
  try {
    const res = await safeFetch(url, deps)
    if (res.status !== 200 || looksLikeHtml(res.body)) return null
    return res.body
  } catch {
    return null
  }
}

async function sitemapResponds(url: string, deps: FetchDeps): Promise<boolean> {
  try {
    return (await safeFetch(url, deps)).status === 200
  } catch {
    return false
  }
}

async function detectSitemap(origin: string, robotsTxt: string | null, deps: FetchDeps): Promise<boolean> {
  if (robotsTxt !== null && parseRobots(robotsTxt).sitemaps.length > 0) return true
  return sitemapResponds(new URL('/sitemap.xml', origin).toString(), deps)
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
    const origin = new URL(page.finalUrl).origin
    const [robotsTxt, llmsTxt] = await Promise.all([
      fetchAuxText(new URL('/robots.txt', origin).toString(), deps),
      fetchAuxText(new URL('/llms.txt', origin).toString(), deps),
    ])
    const ctx: AuditContext = {
      url,
      finalUrl: page.finalUrl,
      status: page.status,
      headers: page.headers,
      html: parseHtml(page.body),
      robotsTxt,
      llmsTxt,
      sitemapFound: await detectSitemap(origin, robotsTxt, deps),
    }
    const checks = runChecks(ctx)
    return { status: 'ok', ...scoreChecks(checks), checks }
  } catch (error) {
    return errorOutcome(error)
  }
}

export { AuditFetchError, safeFetch } from './fetcher'
export { diffAudits } from './diff'
export { scoreChecks } from './scoring'
export type * from './types'
