import { z } from 'zod'

export const SITE_NAME_MAX_LENGTH = 80
export const SITE_URL_MAX_LENGTH = 2048

const URL_ERROR = 'Introduce una URL válida, por ejemplo https://ejemplo.com.'
const PROTOCOL_ERROR = 'Solo se admiten direcciones http:// o https://.'
const CREDENTIALS_ERROR = 'La URL no puede incluir usuario ni contraseña.'
const PORT_ERROR = 'Solo se admiten los puertos por defecto (80 para http y 443 para https).'
const ID_ERROR = 'El sitio no es válido.'

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

type NormalizeResult = { ok: true; url: string } | { ok: false; error: string }

/**
 * Normalizes a user-typed site URL: adds `https://` when there is no scheme, lowercases the host,
 * drops the fragment and the trailing slash of the root path. Rejects non-http(s), credentials
 * and non-default ports.
 */
export function normalizeSiteUrl(input: string): NormalizeResult {
  const raw = input.trim()
  if (raw === '' || raw.length > SITE_URL_MAX_LENGTH) return { ok: false, error: URL_ERROR }

  let url: URL
  try {
    url = new URL(SCHEME_PATTERN.test(raw) ? raw : `https://${raw}`)
  } catch {
    return { ok: false, error: URL_ERROR }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, error: PROTOCOL_ERROR }
  if (url.username !== '' || url.password !== '') return { ok: false, error: CREDENTIALS_ERROR }
  if (!url.hostname.includes('.') && !url.hostname.startsWith('[')) {
    return { ok: false, error: URL_ERROR }
  }
  // `URL` already drops the default port (80 for http, 443 for https); any other is rejected (D-SEC-11).
  if (url.port !== '') return { ok: false, error: PORT_ERROR }

  url.hash = ''
  const path = url.pathname === '/' ? '' : url.pathname
  return { ok: true, url: `${url.protocol}//${url.host}${path}${url.search}` }
}

const siteUrlSchema = z.string({ error: URL_ERROR }).transform((value, ctx) => {
  const result = normalizeSiteUrl(value)
  if (!result.ok) {
    ctx.addIssue({ code: 'custom', message: result.error })
    return z.NEVER
  }
  return result.url
})

const siteNameSchema = z
  .string()
  .trim()
  .max(SITE_NAME_MAX_LENGTH, `El nombre no puede superar ${SITE_NAME_MAX_LENGTH} caracteres.`)
  .optional()
  .transform((value) => (value ? value : null))

export const siteSchema = z.object({
  url: siteUrlSchema,
  name: siteNameSchema,
})

export const siteIdSchema = z.object({
  id: z.uuid({ error: ID_ERROR }),
})

export type SiteInput = z.infer<typeof siteSchema>

/** Reads a text field from a form, returning `undefined` for missing or non-text values. */
export function readTextField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

/** State returned by the site server actions to their forms. */
export type SiteActionState = {
  error?: string
  message?: string
}
