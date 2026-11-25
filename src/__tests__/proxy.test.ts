import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
}))

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn(async () => ({ data: { user: auth.user }, error: null })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}))

import { config, proxy } from '@/proxy'

function request(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://faro.test'))
}

describe('proxy', () => {
  beforeEach(() => {
    auth.user = null
    getUser.mockClear()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('refresca la sesión en cada petición', async () => {
    await proxy(request('/'))
    await proxy(request('/login'))
    expect(getUser).toHaveBeenCalledTimes(2)
  })

  it('redirige a /login a un usuario sin sesión que entra en /sitios', async () => {
    const response = await proxy(request('/sitios'))
    expect(response.headers.get('location')).toBe('http://faro.test/login')
  })

  it('redirige a /sitios a un usuario con sesión que entra en /login o /registro', async () => {
    auth.user = { id: 'u1' }
    expect((await proxy(request('/login'))).headers.get('location')).toBe('http://faro.test/sitios')
    expect((await proxy(request('/registro'))).headers.get('location')).toBe(
      'http://faro.test/sitios',
    )
  })

  it('deja ver la landing y la imagen Open Graph sin sesión, y la landing con sesión', async () => {
    expect((await proxy(request('/'))).headers.get('location')).toBeNull()
    expect((await proxy(request('/opengraph-image?abc'))).headers.get('location')).toBeNull()
    auth.user = { id: 'u1' }
    expect((await proxy(request('/'))).headers.get('location')).toBeNull()
  })

  it('excluye los recursos estáticos del matcher', () => {
    const [pattern] = config.matcher
    const regex = new RegExp(`^${pattern}$`)
    expect(regex.test('/sitios')).toBe(true)
    expect(regex.test('/_next/static/chunk.js')).toBe(false)
    expect(regex.test('/favicon.ico')).toBe(false)
    expect(regex.test('/robots.txt')).toBe(false)
    expect(regex.test('/sitemap.xml')).toBe(false)
    expect(regex.test('/llms.txt')).toBe(false)
  })
})
