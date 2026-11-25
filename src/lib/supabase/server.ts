import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { readSupabaseEnv } from './env'
import type { Database } from './types'

export async function createClient() {
  // Read the request first so prerendering stops here instead of requiring env at build time.
  const cookieStore = await cookies()
  const { url, anonKey } = readSupabaseEnv()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies; the session must be refreshed by the proxy.
        }
      },
    },
  })
}
