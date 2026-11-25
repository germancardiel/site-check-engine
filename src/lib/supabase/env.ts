export type SupabaseEnv = {
  url: string
  anonKey: string
}

type RawSupabaseEnv = {
  url: string | undefined
  anonKey: string | undefined
}

/**
 * Validates the public Supabase variables. Values are passed in explicitly
 * because Next.js only inlines `process.env.NEXT_PUBLIC_*` on direct access.
 */
export function getSupabaseEnv(raw: RawSupabaseEnv): SupabaseEnv {
  const missing: string[] = []
  if (!raw.url?.trim()) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!raw.anonKey?.trim()) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Supabase: ${missing.join(', ')}. ` +
        'Cópialas de .env.example a .env.local y rellénalas.',
    )
  }

  return { url: raw.url!.trim(), anonKey: raw.anonKey!.trim() }
}

export function readSupabaseEnv(): SupabaseEnv {
  return getSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}
