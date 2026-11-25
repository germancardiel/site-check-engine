import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isBlockedIp, isLocalHostname } from './ip'
import type { FetchFn, LookupFn, SafeFetchOptions, SafeFetchResult } from './types'

export const USER_AGENT = 'FaroBot/1.0 (+https://faro.app)'
export const DEFAULT_TIMEOUT_MS = 10_000
export const DEFAULT_MAX_BYTES = 3 * 1024 * 1024
export const DEFAULT_MAX_REDIRECTS = 5

export type AuditFetchErrorCode =
  | 'INVALID_URL'
  | 'BLOCKED_HOST'
  | 'TOO_MANY_REDIRECTS'
  | 'TIMEOUT'
  | 'TOO_LARGE'
  | 'NETWORK'

export class AuditFetchError extends Error {
  readonly code: AuditFetchErrorCode

  constructor(code: AuditFetchErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AuditFetchError'
    this.code = code
  }
}

const defaultLookup: LookupFn = (hostname, options) => dnsLookup(hostname, options)

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

/** Validates the host of `url` against the SSRF rules, using the resolved IPs. */
export async function assertPublicHost(url: URL, lookup: LookupFn = defaultLookup): Promise<void> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (!hostname || isLocalHostname(hostname)) {
    throw new AuditFetchError('BLOCKED_HOST', `Blocked host: ${hostname}`)
  }
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new AuditFetchError('BLOCKED_HOST', `Blocked IP: ${hostname}`)
    return
  }
  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch (cause) {
    throw new AuditFetchError('NETWORK', `DNS lookup failed: ${hostname}`, { cause })
  }
  if (addresses.length === 0) {
    throw new AuditFetchError('NETWORK', `DNS returned no addresses: ${hostname}`)
  }
  const blocked = addresses.find(({ address }) => isBlockedIp(address))
  if (blocked) {
    throw new AuditFetchError('BLOCKED_HOST', `${hostname} resolves to blocked IP ${blocked.address}`)
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

async function request(fetchFn: FetchFn, url: URL, signal: AbortSignal): Promise<Response> {
  try {
    return await fetchFn(url.toString(), {
      redirect: 'manual',
      signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain;q=0.9,*/*;q=0.8' },
    })
  } catch (cause) {
    if (signal.aborted) throw new AuditFetchError('TIMEOUT', `Timeout fetching ${url}`, { cause })
    throw new AuditFetchError('NETWORK', `Network error fetching ${url}`, { cause })
  }
}

async function fetchFollowing(
  start: URL,
  options: Required<SafeFetchOptions>,
  signal: AbortSignal,
): Promise<SafeFetchResult> {
  const redirects: string[] = []
  let current = start
  for (;;) {
    await assertPublicHost(current, options.lookup)
    const response = await request(options.fetch, current, signal)
    if (!isRedirect(response)) {
      const body = await readBody(response, options.maxBytes)
      const headers = Object.fromEntries(response.headers.entries())
      return { finalUrl: current.toString(), status: response.status, headers, body, redirects }
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
    redirects.push(next.toString())
    current = next
  }
}

/**
 * Fetches a public http(s) URL with SSRF protection (D-SEC-05): the resolved IPs of every
 * hop are validated, redirects are followed manually (max 5), the whole operation has a
 * 10 s timeout and the body is cut at 3 MB.
 */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const options: Required<SafeFetchOptions> = {
    fetch: opts.fetch ?? ((input, init) => globalThis.fetch(input, init)),
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
