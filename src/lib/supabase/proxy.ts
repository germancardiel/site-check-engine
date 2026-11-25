import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { readSupabaseEnv } from './env'
import type { Database } from './types'

export const LOGIN_PATH = '/login'
export const HOME_PATH = '/sitios'

/**
 * Private route prefixes: every top-level folder of `src/app/(app)/` must be listed here
 * (a guard test enforces it). Without a session they redirect to `/login`; any other
 * unknown route reaches Next and gets a real 404. Pages still check `auth.getUser()`.
 */
export const PRIVATE_PREFIXES = ['/sitios'] as const
/** Auth pages: a signed-in user is sent to the app instead. */
const AUTH_PATHS = ['/login', '/registro']

/** Decoded, lower-cased path so encoded or re-cased variants cannot dodge the guard. */
function normalizePath(pathname: string): string {
  let decoded = pathname
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // Malformed escapes: keep the raw path (Next answers it with 400/404 anyway).
  }
  return decoded.replace(/\/{2,}/g, '/').toLowerCase()
}

function matches(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** Decides where a request must be redirected, or `null` to let it through. */
export function getAuthRedirect(rawPathname: string, isSignedIn: boolean): string | null {
  const pathname = normalizePath(rawPathname)
  const isAuthPage = AUTH_PATHS.some((path) => matches(pathname, path))
  if (isAuthPage) return isSignedIn ? HOME_PATH : null
  const isPrivate = PRIVATE_PREFIXES.some((prefix) => matches(pathname, prefix))
  return isPrivate && !isSignedIn ? LOGIN_PATH : null
}

/**
 * Refreshes the Supabase session on every request and applies the route guard.
 * Refreshed cookies and cache headers are copied onto redirects as well.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { url, anonKey } = readSupabaseEnv()
  let response = NextResponse.next({ request })
  const extraHeaders: Record<string, string> = {}

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        Object.assign(extraHeaders, headers)
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const target = getAuthRedirect(request.nextUrl.pathname, Boolean(user))
  if (!target) return response

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = target
  redirectUrl.search = ''
  const redirect = NextResponse.redirect(redirectUrl)
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
  for (const [key, value] of Object.entries(extraHeaders)) redirect.headers.set(key, value)
  return redirect
}
