/** Where a signed-in user lands when no valid `next` was requested. */
export const DEFAULT_NEXT_PATH = '/sitios'
export const NEXT_PATH_MAX_LENGTH = 2048

const PROBE_ORIGIN = 'http://next-path.invalid'
// Browsers drop tabs/newlines and treat `\` as `/`, so `/\t/evil.com` or `/\evil.com` become `//evil.com`.
function hasUnsafeChars(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (char === '\\' || code <= 0x20 || code === 0x7f || /\s/.test(char)) return true
  }
  return false
}

// Escaped `.`, `/` and `\` in the path: `%2E` is a dot segment for the URL parser and the others
// can turn into separators once decoded.
const ENCODED_SEPARATOR = /%(?:2e|2f|5c)/i

/** True if the path part of `raw` has dot segments (`.`/`..`) or escaped separators. */
function hasAmbiguousPath(raw: string): boolean {
  const path = raw.split(/[?#]/, 1)[0]
  if (ENCODED_SEPARATOR.test(path)) return true
  return path.split('/').some((segment) => segment === '.' || segment === '..')
}

/**
 * Returns `raw` only if it is an internal path (D-SEC-14): a string that starts with a single `/`,
 * not `//` nor `/\`, without whitespace, control characters, backslashes, dot segments or escaped
 * separators, whose normalised form (`new URL(raw, origin)`) is same-origin, does not start with
 * `//` and is identical to `raw`. Anything else falls back to `fallback`.
 */
export function safeNextPath(raw: unknown, fallback: string = DEFAULT_NEXT_PATH): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > NEXT_PATH_MAX_LENGTH) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  if (hasUnsafeChars(raw) || hasAmbiguousPath(raw)) return fallback
  const resolved = new URL(raw, PROBE_ORIGIN)
  const normalised = `${resolved.pathname}${resolved.search}${resolved.hash}`
  const isInternal =
    resolved.origin === PROBE_ORIGIN && !resolved.pathname.startsWith('//') && normalised === raw
  return isInternal ? raw : fallback
}

/** `/login` URL that will return to `path` after signing in (only when `path` is a valid internal path). */
export function loginPathWithNext(path: unknown): string {
  const next = safeNextPath(path, '')
  return next ? `/login?next=${encodeURIComponent(next)}` : '/login'
}

export const CONFIRM_PATH = '/auth/confirm'
/** Where an invalid or expired email link lands: the login page explains it (`?error=enlace`). */
export const INVALID_LINK_PATH = '/login?error=enlace'

/** Absolute link to `/auth/confirm` for Supabase emails, optionally carrying an internal `next`. */
export function confirmUrl(base: string, next?: string): string {
  const url = `${base}${CONFIRM_PATH}`
  const target = safeNextPath(next, '')
  return target ? `${url}?next=${encodeURIComponent(target)}` : url
}
