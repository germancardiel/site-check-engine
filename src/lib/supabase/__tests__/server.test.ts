import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }
type CookieMethods = {
  getAll: () => unknown
  setAll: (cookies: CookieToSet[]) => void
}

const { createServerClient, cookieStore } = vi.hoisted(() => ({
  createServerClient: vi.fn<
    (url: string, key: string, options: { cookies: CookieMethods }) => { kind: string }
  >(() => ({ kind: 'server-client' })),
  cookieStore: {
    getAll: vi.fn(() => [{ name: 'sb-token', value: 'abc' }]),
    set: vi.fn(),
  },
}))

vi.mock('@supabase/ssr', () => ({ createServerClient }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }))

import { createClient } from '@/lib/supabase/server'

function cookieMethods(): CookieMethods {
  const call = createServerClient.mock.calls[0]
  if (!call) throw new Error('createServerClient no fue llamado')
  return call[2].cookies
}

describe('createClient (servidor)', () => {
  beforeEach(() => {
    createServerClient.mockClear()
    cookieStore.set.mockReset()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('crea el cliente con las variables del entorno', async () => {
    await expect(createClient()).resolves.toEqual({ kind: 'server-client' })
    expect(createServerClient).toHaveBeenCalledWith(
      'http://supabase.test',
      'anon-key',
      expect.objectContaining({ cookies: expect.any(Object) }),
    )
  })

  it('lee las cookies de la petición', async () => {
    await createClient()
    expect(cookieMethods().getAll()).toEqual([{ name: 'sb-token', value: 'abc' }])
  })

  it('escribe las cookies que pide Supabase', async () => {
    await createClient()
    cookieMethods().setAll([{ name: 'sb-token', value: 'nuevo', options: { path: '/' } }])
    expect(cookieStore.set).toHaveBeenCalledWith('sb-token', 'nuevo', { path: '/' })
  })

  it('ignora el error al escribir cookies desde un Server Component', async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error('Cookies can only be modified in a Server Action or Route Handler.')
    })
    await createClient()
    expect(() =>
      cookieMethods().setAll([{ name: 'sb-token', value: 'x', options: {} }]),
    ).not.toThrow()
  })

  it('falla con un mensaje claro si faltan las variables', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    await expect(createClient()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it('lee las cookies antes que el entorno para no exigir variables al prerenderizar', async () => {
    const headers = await import('next/headers')
    vi.mocked(headers.cookies).mockRejectedValueOnce(new Error('dynamic-usage'))
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    await expect(createClient()).rejects.toThrow('dynamic-usage')
  })
})
