import { afterEach, describe, expect, it, vi } from 'vitest'
import nextConfig from '../../next.config'

async function headersFor(source: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? []
  const entries = rules.filter((rule) => rule.source === source).flatMap((rule) => rule.headers)
  return Object.fromEntries(entries.map(({ key, value }) => [key, value]))
}

describe('next.config.ts headers()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('envía las cabeceras de seguridad en todas las rutas', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('NODE_ENV', 'production')
    const all = await headersFor('/(.*)')
    expect(all['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload')
    expect(all['X-Content-Type-Options']).toBe('nosniff')
    expect(all['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(all['Permissions-Policy']).toContain('camera=(), microphone=(), geolocation=(), browsing-topics=()')
    expect(all['Content-Security-Policy']).toContain("default-src 'self'")
    expect(all['Content-Security-Policy']).toContain("object-src 'none'")
    expect(all['Content-Security-Policy']).toContain("frame-ancestors 'self'")
    expect(all['Content-Security-Policy']).toContain('connect-src \'self\' https://abc.supabase.co')
    expect(all['Content-Security-Policy']).not.toContain('unsafe-eval')
  })

  it('las páginas con sesión llevan Cache-Control: private, no-store', async () => {
    expect((await headersFor('/sitios'))['Cache-Control']).toBe('private, no-store')
    expect((await headersFor('/sitios/:path*'))['Cache-Control']).toBe('private, no-store')
  })
})
