import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import { defineConfig } from 'vitest/config'

/** Only these variables are taken from `.env.local`; nothing else reaches the smoke run. */
const SMOKE_VARS = [
  'SMOKE_BASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DEMO_EMAIL',
  'DEMO_PASSWORD',
] as const

/** Variables already defined in the environment (even empty) win over `.env.local`. */
function smokeEnv(): Record<string, string> {
  const file = fileURLToPath(new URL('./.env.local', import.meta.url))
  const local = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}
  const env: Record<string, string> = {}
  for (const name of SMOKE_VARS) {
    const value = name in process.env ? process.env[name] : local[name]
    if (value) env[name] = value
  }
  warnIfNoSession(env)
  return env
}

/** The session part is skipped without these variables; say so before the run starts. */
function warnIfNoSession(env: Record<string, string>): void {
  const required = SMOKE_VARS.filter((name) => name !== 'SMOKE_BASE_URL')
  const missing = required.filter((name) => !env[name])
  if (missing.length === 0) return
  console.warn(
    `\n[smoke] AVISO: se omite la parte con sesión porque faltan ${missing.join(', ')}. ` +
      'Defínelas en .env.local para probar /sitios con el usuario demo.\n',
  )
}

/**
 * Smoke tests against a running Faro (`next start` or production). They use the real
 * network, so they are never part of `npm test` (D-TEST-04): run them with `npm run test:smoke`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/__smoke__/**/*.smoke.ts'],
    env: smokeEnv(),
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
