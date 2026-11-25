import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createBrowserClient } = vi.hoisted(() => ({
  createBrowserClient: vi.fn(() => ({ kind: 'browser-client' })),
}))

vi.mock('@supabase/ssr', () => ({ createBrowserClient }))

import { createClient } from '@/lib/supabase/client'

describe('createClient (navegador)', () => {
  beforeEach(() => {
    createBrowserClient.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('crea el cliente con la URL y la anon key del entorno', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')

    expect(createClient()).toEqual({ kind: 'browser-client' })
    expect(createBrowserClient).toHaveBeenCalledWith('http://supabase.test', 'anon-key')
  })

  it('falla con un mensaje claro si faltan las variables', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    expect(() => createClient()).toThrow(/Faltan variables de entorno de Supabase/)
    expect(createBrowserClient).not.toHaveBeenCalled()
  })
})
