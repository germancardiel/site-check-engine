import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { readSupabaseEnv } from './env'
import type { Database } from './types'

export async function createClient() {
  // D-QA-08: auth-js reads `Date.now()` while checking the session, so wait for a real
  // request before anything else. It also stops prerendering before env is required.
  await connection()
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
