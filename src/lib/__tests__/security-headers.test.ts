import { describe, expect, it } from 'vitest'
import {
  buildContentSecurityPolicy,
  buildHeaderRules,
  PRIVATE_CACHE_CONTROL,
  PRIVATE_SOURCES,
  PUBLIC_CACHE_CONTROL,
  securityHeaders,
  supabaseOrigins,
} from '@/lib/security-headers'
import { PRIVATE_PREFIXES } from '@/lib/supabase/proxy'

const SUPABASE_URL = 'https://abc.supabase.co'
const PROD = { supabaseUrl: SUPABASE_URL, isDev: false }

function directives(csp: string): Map<string, string> {
  return new Map(
    csp.split(';').map((part) => {
      const [name, ...values] = part.trim().split(/\s+/)
      return [name, values.join(' ')] as const
    }),
  )
}

describe('supabaseOrigins', () => {
  it('devuelve el origen https y el de websockets, sin ruta', () => {
    expect(supabaseOrigins('https://abc.supabase.co/rest/v1')).toEqual([
      'https://abc.supabase.co',
      'wss://abc.supabase.co',
    ])
  })

  it('admite http en local con puerto', () => {
    expect(supabaseOrigins(' http://127.0.0.1:54321 ')).toEqual([
      'http://127.0.0.1:54321',
      'ws://127.0.0.1:54321',
    ])
  })

  it('ignora valores ausentes, inválidos o con otro protocolo', () => {
    expect(supabaseOrigins(undefined)).toEqual([])
    expect(supabaseOrigins('  ')).toEqual([])
    expect(supabaseOrigins('no es una url')).toEqual([])
    expect(supabaseOrigins('javascript:alert(1)')).toEqual([])
  })
})

describe('buildContentSecurityPolicy', () => {
  it('incluye las directivas exigidas por D-SEC-13 y el alcance de T17', () => {
    const csp = directives(buildContentSecurityPolicy(PROD))
    expect(csp.get('default-src')).toBe("'self'")
    expect(csp.get('object-src')).toBe("'none'")
    expect(csp.get('base-uri')).toBe("'self'")
    expect(csp.get('form-action')).toBe("'self'")
    expect(csp.get('frame-ancestors')).toBe("'self'")
    expect(csp.get('connect-src')).toBe("'self' https://abc.supabase.co wss://abc.supabase.co")
    expect(csp.get('img-src')).toBe("'self' blob: data:")
    expect(csp.get('font-src')).toBe("'self'")
    expect(csp.get('style-src')).toBe("'self' 'unsafe-inline'")
  })

  it("solo añade 'unsafe-eval' en desarrollo", () => {
    expect(directives(buildContentSecurityPolicy(PROD)).get('script-src')).toBe("'self' 'unsafe-inline'")
    expect(
      directives(buildContentSecurityPolicy({ ...PROD, isDev: true })).get('script-src'),
    ).toBe("'self' 'unsafe-inline' 'unsafe-eval'")
  })

  it('sin URL de Supabase, connect-src se queda en self', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: undefined, isDev: false }))
    expect(csp.get('connect-src')).toBe("'self'")
  })
})

describe('securityHeaders', () => {
  it('fija la lista y el valor de las cabeceras de seguridad', () => {
    expect(securityHeaders(PROD)).toEqual([
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()',
      },
      { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(PROD) },
    ])
  })
})

describe('buildHeaderRules', () => {
  it('aplica las cabeceras de seguridad y la caché pública a todas las rutas', () => {
    const [all] = buildHeaderRules(PROD)
    expect(all.source).toBe('/(.*)')
    expect(all.headers).toEqual([
      ...securityHeaders(PROD),
      { key: 'Cache-Control', value: PUBLIC_CACHE_CONTROL },
    ])
  })

  it('marca /sitios, /nueva-contrasena y sus subrutas como private, no-store después de la regla general', () => {
    const rules = buildHeaderRules(PROD)
    expect(rules.slice(1)).toEqual([
      { source: '/sitios', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/sitios/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/nueva-contrasena', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/nueva-contrasena/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ])
    expect(PRIVATE_CACHE_CONTROL).not.toMatch(/public/)
  })

  it('cubre todos los prefijos privados del proxy', () => {
    for (const prefix of PRIVATE_PREFIXES) {
      expect(PRIVATE_SOURCES).toContain(prefix)
      expect(PRIVATE_SOURCES).toContain(`${prefix}/:path*`)
    }
  })
})
