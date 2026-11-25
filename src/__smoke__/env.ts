/** Configuration of the smoke run, read from the environment (see `vitest.smoke.config.mts`). */
export type SmokeCredentials = {
  supabaseUrl: string
  anonKey: string
  email: string
  password: string
}

function read(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/** `SMOKE_BASE_URL` is mandatory: the origin of the Site Check Engine instance under test, without a trailing slash. */
export function smokeBaseUrl(): string {
  const raw = read('SMOKE_BASE_URL')
  if (!raw) {
    throw new Error(
      'Falta SMOKE_BASE_URL. Ejemplo: SMOKE_BASE_URL=http://localhost:3100 npm run test:smoke',
    )
  }
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('SMOKE_BASE_URL debe empezar por http:// o https://.')
  }
  return url.origin
}

/** Demo credentials and public Supabase config, or `null` (plus the names missing) if any is absent. */
export function smokeCredentials(): { credentials: SmokeCredentials | null; missing: string[] } {
  const values = {
    supabaseUrl: read('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    email: read('DEMO_EMAIL'),
    password: read('DEMO_PASSWORD'),
  }
  const names: Record<keyof typeof values, string> = {
    supabaseUrl: 'NEXT_PUBLIC_SUPABASE_URL',
    anonKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    email: 'DEMO_EMAIL',
    password: 'DEMO_PASSWORD',
  }
  const missing = (Object.keys(values) as (keyof typeof values)[])
    .filter((key) => !values[key])
    .map((key) => names[key])
  if (missing.length > 0) return { credentials: null, missing }
  return { credentials: values as SmokeCredentials, missing }
}

/** GET without following redirects, so 307s can be asserted. Never logs headers or cookies. */
export async function smokeGet(path: string, cookie?: string): Promise<Response> {
  return fetch(new URL(path, smokeBaseUrl()), {
    redirect: 'manual',
    headers: cookie ? { cookie } : undefined,
  })
}
