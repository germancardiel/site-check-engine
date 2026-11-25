import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { readSupabaseEnv } from './env'
import type { Database } from './types'

export const LOGIN_PATH = '/login'
export const HOME_PATH = '/sitios'

/** Routes reachable without a session. Everything else (the `(app)` group) is private. */
const PUBLIC_PATHS = ['/']
/** Public metadata files (and anything below them, e.g. hashed image variants). */
const PUBLIC_FILES = ['/robots.txt', '/sitemap.xml', '/llms.txt', '/opengraph-image']
/** Auth pages: a signed-in user is sent to the app instead. */
const AUTH_PATHS = ['/login', '/registro']

function matches(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** Decides where a request must be redirected, or `null` to let it through. */
export function getAuthRedirect(pathname: string, isSignedIn: boolean): string | null {
  const isAuthPage = AUTH_PATHS.some((path) => matches(pathname, path))
  if (isAuthPage) return isSignedIn ? HOME_PATH : null
  if (PUBLIC_PATHS.includes(pathname)) return null
  if (PUBLIC_FILES.some((path) => matches(pathname, path))) return null
  return isSignedIn ? null : LOGIN_PATH
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
