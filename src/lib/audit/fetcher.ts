import { isIP } from 'node:net'
import { AuditFetchError } from './errors'
import { isBlockedIp, isLocalHostname } from './ip'
import { createSafeLookup, defaultLookup } from './safe-lookup'
import { nodeTransport } from './transport'
import type { RedirectHop, SafeFetchOptions, SafeFetchResult } from './types'

export { AuditFetchError, type AuditFetchErrorCode } from './errors'
export { resolvePublicAddresses } from './safe-lookup'

export const USER_AGENT = 'SiteCheckEngineBot/1.0 (+https://site-check-engine.vercel.app)'
export const DEFAULT_TIMEOUT_MS = 10_000
export const DEFAULT_MAX_BYTES = 3 * 1024 * 1024
export const DEFAULT_MAX_REDIRECTS = 5

type ResolvedOptions = {
  transport: NonNullable<SafeFetchOptions['transport']>
  lookup: NonNullable<SafeFetchOptions['lookup']>
  timeoutMs: number
  maxBytes: number
  maxRedirects: number
}

function parseHttpUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch (cause) {
    throw new AuditFetchError('INVALID_URL', `Invalid URL: ${raw}`, { cause })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AuditFetchError('INVALID_URL', `Unsupported protocol: ${url.protocol}`)
  }
  return url
}

/**
 * Static SSRF checks for the host of `url` (D-SEC-05): `localhost`, blocked IP literals and
 * non-default ports (D-SEC-11; `URL` leaves `port` empty for 80/http and 443/https).
 * Hostnames are resolved and validated later, once, by the socket's `lookup` (no TOCTOU).
 */
export function assertPublicHost(url: URL): void {
  if (url.port !== '') {
    throw new AuditFetchError('BLOCKED_HOST', `Blocked port: ${url.port}`)
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (!hostname || isLocalHostname(hostname)) {
    throw new AuditFetchError('BLOCKED_HOST', `Blocked host: ${hostname}`)
  }
  if (isIP(hostname) && isBlockedIp(hostname)) {
    throw new AuditFetchError('BLOCKED_HOST', `Blocked IP: ${hostname}`)
  }
}

async function readBody(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel()
    throw new AuditFetchError('TOO_LARGE', `Declared body of ${declared} bytes`)
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel()
      throw new AuditFetchError('TOO_LARGE', `Body exceeded ${maxBytes} bytes`)
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

function isRedirect(response: Response): boolean {
  return response.status >= 300 && response.status < 400 && response.headers.has('location')
}

async function request(
  options: ResolvedOptions,
  url: URL,
  signal: AbortSignal,
): Promise<{ response: Response; ttfbMs: number }> {
  const started = performance.now()
  try {
    const response = await options.transport(url.toString(), {
      signal,
      lookup: createSafeLookup(options.lookup),
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain;q=0.9,*/*;q=0.8' },
    })
    return { response, ttfbMs: Math.max(0, Math.round(performance.now() - started)) }
  } catch (cause) {
    if (cause instanceof AuditFetchError) throw cause
    if (signal.aborted) throw new AuditFetchError('TIMEOUT', `Timeout fetching ${url}`, { cause })
    throw new AuditFetchError('NETWORK', `Network error fetching ${url}`, { cause })
  }
}

async function fetchFollowing(
  start: URL,
  options: ResolvedOptions,
  signal: AbortSignal,
): Promise<SafeFetchResult> {
  const redirects: string[] = []
  const redirectChain: RedirectHop[] = []
  let current = start
  for (;;) {
    assertPublicHost(current)
    const { response, ttfbMs } = await request(options, current, signal)
    if (!isRedirect(response)) {
      const body = await readBody(response, options.maxBytes)
      const headers = Object.fromEntries(response.headers.entries())
      return {
        finalUrl: current.toString(),
        status: response.status,
        headers,
        body,
        redirects,
        redirectChain,
        ttfbMs,
      }
    }
    await response.body?.cancel()
    if (redirects.length >= options.maxRedirects) {
      throw new AuditFetchError('TOO_MANY_REDIRECTS', `More than ${options.maxRedirects} redirects`)
    }
    let next: URL
    try {
      next = parseHttpUrl(new URL(response.headers.get('location') ?? '', current).toString())
    } catch (cause) {
      throw new AuditFetchError('INVALID_URL', 'Invalid redirect location', { cause })
    }
    redirectChain.push({ url: current.toString(), status: response.status })
    redirects.push(next.toString())
    current = next
  }
}

/**
 * Fetches a public http(s) URL with SSRF protection (D-SEC-05): every hop is resolved once
 * by a validating `lookup` and the socket connects only to those validated IPs (TLS against
 * the hostname); redirects are followed manually (max 5), the whole operation has a 10 s
 * timeout (DNS and body included) and the body is cut at 3 MB.
 */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const options: ResolvedOptions = {
    transport: opts.transport ?? nodeTransport,
    lookup: opts.lookup ?? defaultLookup,
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBytes: opts.maxBytes ?? DEFAULT_MAX_BYTES,
    maxRedirects: opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
  }
  const start = parseHttpUrl(rawUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)
  // Also covers stages that do not observe the signal (e.g. DNS lookup).
  const timeout = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      'abort',
      () => reject(new AuditFetchError('TIMEOUT', `Timeout fetching ${rawUrl}`)),
      { once: true },
    )
  })
  try {
    return await Promise.race([fetchFollowing(start, options, controller.signal), timeout])
  } catch (error) {
    if (error instanceof AuditFetchError) throw error
    if (controller.signal.aborted) {
      throw new AuditFetchError('TIMEOUT', `Timeout fetching ${rawUrl}`, { cause: error })
    }
    throw new AuditFetchError('NETWORK', `Network error fetching ${rawUrl}`, { cause: error })
  } finally {
    clearTimeout(timer)
  }
}
