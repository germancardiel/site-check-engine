import net from 'node:net'
import tls from 'node:tls'
import { comparableUrl } from './checks/helpers'
import { safeFetch } from './fetcher'
import { looksLikeHtml, parseHtml } from './parse'
import { parseRobots } from './robots'
import { createSafeLookup, defaultLookup } from './safe-lookup'
import { extractJsonLdInfo, extractVisibleText, sentences, words } from './text'
import { nodeTransport } from './transport'
import type {
  AuditContext,
  FetchDeps,
  HttpResult,
  LookupFn,
  PsiInfo,
  RobotsInfo,
  SafeFetchResult,
  SitemapInfo,
  TlsInfo,
} from './types'

export { comparableUrl }

async function fetchRobots(origin: string, deps: FetchDeps): Promise<RobotsInfo> {
  try {
    const res = await safeFetch(`${origin}/robots.txt`, { ...deps, maxBytes: 512 * 1024, timeoutMs: 6000 })
    const isText = !/html/i.test(res.headers['content-type'] ?? '') && !looksLikeHtml(res.body)
    if (res.status === 200 && isText) return { found: true, status: res.status, text: res.body }
    return { found: false, status: res.status, text: '' }
  } catch {
    return { found: false, status: null, text: '' }
  }
}

const LOC_RE = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi

async function fetchSitemaps(origin: string, declared: string[], target: string, deps: FetchDeps): Promise<SitemapInfo> {
  const queue = declared.length > 0 ? [...declared] : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]
  const checked: string[] = []
  const urls: string[] = []
  const wanted = comparableUrl(target)
  let found = false
  let containsUrl = false

  while (queue.length > 0 && checked.length < 6 && !containsUrl) {
    const sm = queue.shift()!
    if (checked.includes(sm)) continue
    checked.push(sm)
    try {
      const res = await safeFetch(sm, { ...deps, maxBytes: 3 * 1024 * 1024, timeoutMs: 8000 })
      if (res.status !== 200 || !/<(urlset|sitemapindex)/i.test(res.body)) continue
      found = true
      const locs = [...res.body.matchAll(LOC_RE)].map((m) => m[1].replace(/&amp;/g, '&').trim())
      if (/<sitemapindex/i.test(res.body)) {
        const sorted = locs.sort((a, b) => Number(/image|video/i.test(a)) - Number(/image|video/i.test(b)))
        queue.push(...sorted.filter((l) => !l.endsWith('.gz')))
      } else {
        urls.push(...locs)
        if (locs.some((l) => comparableUrl(l) === wanted)) containsUrl = true
      }
    } catch {
      /* sitemap inaccesible: seguimos */
    }
  }
  return { declaredInRobots: declared.length > 0, urls: urls.slice(0, 50), checked, found, containsUrl }
}

async function fetchLlmsTxt(origin: string, deps: FetchDeps): Promise<{ found: boolean; url: string }> {
  const url = `${origin}/llms.txt`
  try {
    const res = await safeFetch(url, { ...deps, maxBytes: 256 * 1024, timeoutMs: 6000 })
    const isText = !/html/i.test(res.headers['content-type'] ?? '') && !looksLikeHtml(res.body)
    return { found: res.status === 200 && isText && res.body.trim().length > 0, url }
  } catch {
    return { found: false, url }
  }
}

/* ---------- TLS: certificado + ALPN (HTTP/2) ---------- */

export type TlsConnectFn = typeof tls.connect

const DAY_MS = 86_400_000

/** Whole days from `now` until `validTo` (negative once expired). `now` is a parameter (D-QA-08). */
export function daysUntil(validTo: Date, now: Date): number {
  return Math.floor((validTo.getTime() - now.getTime()) / DAY_MS)
}

export function probeTls(
  url: URL,
  now: Date,
  lookup: LookupFn = defaultLookup,
  timeoutMs = 6000,
  connectFn: TlsConnectFn = tls.connect,
): Promise<TlsInfo | null> {
  if (url.protocol !== 'https:') return Promise.resolve(null)
  return new Promise((resolve) => {
    const socket = connectFn({
      host: url.hostname,
      port: Number(url.port) || 443,
      servername: net.isIP(url.hostname) ? undefined : url.hostname,
      ALPNProtocols: ['h2', 'http/1.1'],
      lookup: createSafeLookup(lookup),
      rejectUnauthorized: false,
      timeout: timeoutMs,
    })
    const done = (info: TlsInfo | null) => {
      socket.destroy()
      resolve(info)
    }
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate()
      const validTo = cert?.valid_to ? new Date(cert.valid_to) : null
      const issuer = cert?.issuer ? (cert.issuer.O as string) || (cert.issuer.CN as string) || null : null
      done({
        validTo: validTo ? validTo.toISOString() : null,
        daysLeft: validTo ? daysUntil(validTo, now) : null,
        issuer: Array.isArray(issuer) ? issuer[0] : issuer,
        alpn: socket.alpnProtocol || null,
        authorized: socket.authorized,
        error: socket.authorizationError ? String(socket.authorizationError) : undefined,
      })
    })
    socket.once('timeout', () => done(null))
    socket.once('error', () => done(null))
  })
}

/* ---------- PageSpeed Insights ---------- */

type PsiAudit = { numericValue?: number; score?: number | null; details?: { overallSavingsBytes?: number } }

export function emptyPsi(error: string): PsiInfo {
  return {
    lcpMs: null,
    cls: null,
    tbtMs: null,
    unusedJsBytes: null,
    unusedJsScore: null,
    field: { lcpMs: null, cls: null, inpMs: null, origin: null },
    error,
  }
}

export async function fetchPsi(
  url: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<PsiInfo | null> {
  const params = new URLSearchParams({ url, strategy: 'mobile', category: 'performance', locale: 'es' })
  if (process.env.PAGESPEED_API_KEY) params.set('key', process.env.PAGESPEED_API_KEY)
  try {
    const res = await fetchFn(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    if (!res.ok) {
      return emptyPsi(res.status === 429 ? 'Cuota de PageSpeed agotada' : `PageSpeed respondió ${res.status}`)
    }
    const data = await res.json()
    const audits: Record<string, PsiAudit> = data?.lighthouseResult?.audits ?? {}
    const pick = (exp: Record<string, { percentile?: number }> | undefined, key: string) =>
      exp?.[key]?.percentile ?? null
    const urlMetrics = data?.loadingExperience?.metrics
    const originMetrics = data?.originLoadingExperience?.metrics
    const field = urlMetrics && Object.keys(urlMetrics).length > 0 ? urlMetrics : null
    const fieldSource: 'url' | 'origin' | null = field ? 'url' : originMetrics ? 'origin' : null
    const m = field ?? originMetrics
    const clsRaw = pick(m, 'CUMULATIVE_LAYOUT_SHIFT_SCORE')
    return {
      lcpMs: audits['largest-contentful-paint']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      tbtMs: audits['total-blocking-time']?.numericValue ?? null,
      unusedJsBytes: audits['unused-javascript']?.details?.overallSavingsBytes ?? null,
      unusedJsScore: audits['unused-javascript']?.score ?? null,
      field: {
        lcpMs: pick(m, 'LARGEST_CONTENTFUL_PAINT_MS'),
        cls: clsRaw === null ? null : clsRaw / 100,
        inpMs: pick(m, 'INTERACTION_TO_NEXT_PAINT'),
        origin: fieldSource,
      },
    }
  } catch (e) {
    return emptyPsi(e instanceof Error && e.name === 'TimeoutError' ? 'PageSpeed tardó demasiado' : 'PageSpeed no disponible')
  }
}

function toHttpResult(fetched: SafeFetchResult): HttpResult {
  return {
    url: fetched.finalUrl,
    status: fetched.status,
    headers: fetched.headers,
    body: fetched.body,
    bytes: Buffer.byteLength(fetched.body, 'utf8'),
    ttfbMs: fetched.ttfbMs,
    redirects: fetched.redirectChain,
  }
}

export async function buildAuditContext(
  inputUrl: string,
  fetchedPage: SafeFetchResult,
  deps: FetchDeps = {},
): Promise<AuditContext> {
  const page = toHttpResult(fetchedPage)
  const finalUrl = new URL(page.url)
  const origin = finalUrl.origin
  const isRealTransport = !deps.transport || deps.transport === nodeTransport

  const psiRunner = deps.fetchPsi ?? deps.psiFetcher ?? (isRealTransport ? fetchPsi : null)
  const { now } = deps
  // The certificate expiry needs the audit time; without `deps.now` the TLS probe is skipped.
  const defaultTls = isRealTransport && now ? (u: URL) => probeTls(u, now, deps.lookup) : null
  const tlsRunner = deps.probeTls ?? deps.tlsProber ?? defaultTls
  const botRunner = deps.probeBots ?? null

  const psiPromise = psiRunner ? psiRunner(finalUrl.href).catch(() => null) : Promise.resolve(null)
  const tlsPromise = tlsRunner ? tlsRunner(finalUrl).catch(() => null) : Promise.resolve(null)
  const botsPromise = botRunner ? botRunner(finalUrl.href).catch(() => []) : Promise.resolve([])

  const $ = parseHtml(page.body)
  const { visible, prose } = extractVisibleText($)
  const text = { visible, words: words(visible).length, sentences: sentences(prose) }

  const [robots, llmsTxt] = await Promise.all([
    fetchRobots(origin, deps),
    fetchLlmsTxt(origin, deps),
  ])
  const parsed = parseRobots(robots.text)
  const [sitemap, psi, tls, botProbes] = await Promise.all([
    fetchSitemaps(origin, parsed.sitemaps, finalUrl.href, deps),
    psiPromise,
    tlsPromise,
    botsPromise,
  ])

  return {
    inputUrl,
    url: finalUrl,
    page,
    $,
    robots,
    sitemap,
    llmsTxt,
    tls,
    psi,
    botProbes,
    jsonLd: extractJsonLdInfo($),
    text,
  }
}
