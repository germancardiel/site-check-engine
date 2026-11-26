/** A single HTTP header, in the shape `next.config.ts` `headers()` expects. */
export type HeaderEntry = { key: string; value: string }

/** A `headers()` rule of `next.config.ts`. */
export type HeaderRule = { source: string; headers: HeaderEntry[] }

export type SecurityHeadersOptions = {
  /** Value of `NEXT_PUBLIC_SUPABASE_URL`; only its origin is allowed in `connect-src`. */
  supabaseUrl: string | undefined
  /** `next dev` needs `'unsafe-eval'` (React rebuilds server error stacks with `eval`). */
  isDev: boolean
}

export const PRIVATE_CACHE_CONTROL = 'private, no-store'
export const PUBLIC_CACHE_CONTROL = 'public, max-age=0, must-revalidate'

/** Routes rendered with the user's session (D-SEC-13). Keep in sync with `PRIVATE_PREFIXES`. */
export const PRIVATE_SOURCES = ['/sitios', '/sitios/:path*'] as const

/**
 * `https://x.supabase.co/rest` → `['https://x.supabase.co', 'wss://x.supabase.co']`.
 * Anything that is not a valid http(s) URL yields no origin.
 */
export function supabaseOrigins(supabaseUrl: string | undefined): string[] {
  if (!supabaseUrl?.trim()) return []
  let url: URL
  try {
    url = new URL(supabaseUrl.trim())
  } catch {
    return []
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return []
  const socketProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return [url.origin, `${socketProtocol}//${url.host}`]
}

/**
 * Static CSP. With `cacheComponents` (Partial Prerendering) the static shell is built
 * without a request, so per-request nonces cannot reach Next's inline bootstrap scripts:
 * `'unsafe-inline'` is therefore needed in `script-src` (Next's inline flight scripts and
 * the landing's inline script) and in `style-src` (inline `style` attributes for dynamic
 * values and Next's inline styles).
 */
export function buildContentSecurityPolicy({ supabaseUrl, isDev }: SecurityHeadersOptions): string {
  const connectSrc = ["'self'", ...supabaseOrigins(supabaseUrl)].join(' ')
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ]
  return directives.join('; ')
}

/** Headers sent on every response. */
export function securityHeaders(options: SecurityHeadersOptions): HeaderEntry[] {
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()',
    },
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options) },
  ]
}

/**
 * Rules for `next.config.ts`. The private rules come last so their `Cache-Control`
 * overrides the public one (in Next, the last matching rule wins for the same key).
 */
export function buildHeaderRules(options: SecurityHeadersOptions): HeaderRule[] {
  return [
    {
      source: '/(.*)',
      headers: [...securityHeaders(options), { key: 'Cache-Control', value: PUBLIC_CACHE_CONTROL }],
    },
    ...PRIVATE_SOURCES.map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value: PRIVATE_CACHE_CONTROL }],
    })),
  ]
}
