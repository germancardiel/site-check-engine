import { createChunks, stringToBase64URL } from '@supabase/ssr'
import type { SmokeCredentials } from './env'

type PasswordGrantSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: { id: string; email?: string }
}

export type SmokeSession = {
  /** `Cookie` header with the session, never printed. */
  cookie: string
  accessToken: string
}

function supabaseHeaders(credentials: SmokeCredentials, accessToken?: string): Record<string, string> {
  return {
    apikey: credentials.anonKey,
    'content-type': 'application/json',
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  }
}

/** Same storage key as `@supabase/supabase-js`: `sb-<project-ref>-auth-token`. */
export function authCookieName(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
}

/**
 * Builds the `Cookie` header exactly as `@supabase/ssr` writes it: the session JSON encoded
 * as `base64-<base64url>` and split into `.0`, `.1`… chunks when it is too long.
 */
export function buildSessionCookie(supabaseUrl: string, session: PasswordGrantSession, nowSeconds: number): string {
  const stored = { ...session, expires_at: session.expires_at ?? nowSeconds + session.expires_in }
  const value = `base64-${stringToBase64URL(JSON.stringify(stored))}`
  return createChunks(authCookieName(supabaseUrl), value)
    .map((chunk) => `${chunk.name}=${chunk.value}`)
    .join('; ')
}

/** Password grant against Supabase Auth with the anon key. Errors carry only the HTTP status. */
export async function signIn(credentials: SmokeCredentials): Promise<SmokeSession> {
  const response = await fetch(`${credentials.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: supabaseHeaders(credentials),
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`No se pudo iniciar sesión con el usuario demo (HTTP ${response.status}).`)
  }
  const session = (await response.json()) as PasswordGrantSession
  const cookie = buildSessionCookie(credentials.supabaseUrl, session, Math.floor(Date.now() / 1000))
  return { cookie, accessToken: session.access_token }
}

/** Revokes only this smoke session (`scope=local`); other sessions of the demo stay open. */
export async function signOut(credentials: SmokeCredentials, session: SmokeSession): Promise<void> {
  const response = await fetch(`${credentials.supabaseUrl}/auth/v1/logout?scope=local`, {
    method: 'POST',
    headers: supabaseHeaders(credentials, session.accessToken),
  })
  await response.body?.cancel()
}

/** Id of one of the demo's sites (read-only, through RLS), or `null` if it has none. */
export async function firstSiteId(credentials: SmokeCredentials, session: SmokeSession): Promise<string | null> {
  const response = await fetch(`${credentials.supabaseUrl}/rest/v1/sites?select=id&limit=1`, {
    headers: supabaseHeaders(credentials, session.accessToken),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`No se pudieron leer los sitios del demo (HTTP ${response.status}).`)
  }
  const rows = (await response.json()) as { id: string }[]
  return rows[0]?.id ?? null
}
