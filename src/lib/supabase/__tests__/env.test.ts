import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseEnv, readSupabaseEnv } from '@/lib/supabase/env'

describe('getSupabaseEnv', () => {
  it('devuelve las variables recortadas cuando existen', () => {
    expect(getSupabaseEnv({ url: ' http://supabase.test ', anonKey: 'anon-key ' })).toEqual({
      url: 'http://supabase.test',
      anonKey: 'anon-key',
    })
  })

  it('falla con un mensaje claro si falta la URL', () => {
    expect(() => getSupabaseEnv({ url: undefined, anonKey: 'anon-key' })).toThrow(
      /Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL\./,
    )
  })

  it('falla con un mensaje claro si falta la anon key', () => {
    expect(() => getSupabaseEnv({ url: 'http://supabase.test', anonKey: '  ' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    )
  })

  it('lista todas las variables que faltan', () => {
    expect(() => getSupabaseEnv({ url: '', anonKey: undefined })).toThrow(
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  })
})

describe('readSupabaseEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lee las variables NEXT_PUBLIC_* de process.env', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    expect(readSupabaseEnv()).toEqual({ url: 'http://supabase.test', anonKey: 'anon-key' })
  })

  it('falla si process.env no tiene las variables', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect(() => readSupabaseEnv()).toThrow(/Faltan variables de entorno de Supabase/)
  })
})
