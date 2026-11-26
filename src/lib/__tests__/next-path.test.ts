import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NEXT_PATH,
  NEXT_PATH_MAX_LENGTH,
  confirmUrl,
  loginPathWithNext,
  safeNextPath,
} from '@/lib/next-path'

describe('safeNextPath (D-SEC-14)', () => {
  it('acepta rutas internas, con query y hash', () => {
    for (const path of ['/sitios', '/sitios/abc', '/sitios/abc/auditorias/def?x=1#plan', '/nueva-contrasena', '/']) {
      expect(safeNextPath(path)).toBe(path)
    }
  })

  it('acepta rutas raras pero internas si empiezan por una sola barra', () => {
    expect(safeNextPath('/no-existe-xyz')).toBe('/no-existe-xyz')
    expect(safeNextPath('/sitios/a.b/..c/.d')).toBe('/sitios/a.b/..c/.d')
    expect(safeNextPath('/sitios?x=a%2Fb')).toBe('/sitios?x=a%2Fb')
  })

  it('rechaza rutas que el navegador normaliza a //evil.com (segmentos . y .., escapes %2E/%2F/%5C)', () => {
    for (const path of [
      '/.//evil.com',
      '/sitios/..//evil.com',
      '/%2E/%2Fevil.com',
      '/%2e/%2fevil.com',
      '/%2E%2E//evil.com',
      '/%2F%2Fevil.com',
      '/%5C%5Cevil.com',
      '/./sitios',
      '/sitios/..',
      '/sitios/.',
    ]) {
      expect(safeNextPath(path), path).toBe(DEFAULT_NEXT_PATH)
    }
  })

  it('rechaza rutas cuya forma normalizada no coincide con la recibida', () => {
    for (const path of ['/sitios?', '/sitios#', '/sitios/ñ', '/sitios/"x"']) {
      expect(safeNextPath(path), path).toBe(DEFAULT_NEXT_PATH)
    }
  })

  it('rechaza destinos externos o ambiguos y usa /sitios', () => {
    for (const path of [
      '//evil.com',
      '/\\evil.com',
      '\\\\evil.com',
      'https://evil.com',
      'http://evil.com/sitios',
      'javascript:alert(1)',
      'evil.com',
      'sitios',
      '/\t/evil.com',
      '/\n/evil.com',
      '/ /evil.com',
      '/sitios\\..\\..\\evil',
      '',
    ]) {
      expect(safeNextPath(path), path).toBe(DEFAULT_NEXT_PATH)
    }
  })

  it('rechaza valores que no son texto o demasiado largos', () => {
    for (const value of [undefined, null, 42, ['/sitios'], { path: '/sitios' }]) {
      expect(safeNextPath(value)).toBe(DEFAULT_NEXT_PATH)
    }
    expect(safeNextPath(`/${'a'.repeat(NEXT_PATH_MAX_LENGTH)}`)).toBe(DEFAULT_NEXT_PATH)
  })

  it('usa el destino por defecto recibido', () => {
    expect(safeNextPath('//evil.com', '/nueva-contrasena')).toBe('/nueva-contrasena')
  })
})

describe('loginPathWithNext', () => {
  it('añade next codificado si la ruta es interna', () => {
    expect(loginPathWithNext('/sitios/abc')).toBe('/login?next=%2Fsitios%2Fabc')
    expect(loginPathWithNext('/sitios?x=1')).toBe('/login?next=%2Fsitios%3Fx%3D1')
  })

  it('devuelve /login sin next si la ruta no es interna', () => {
    expect(loginPathWithNext('//evil.com')).toBe('/login')
    expect(loginPathWithNext(undefined)).toBe('/login')
  })
})

describe('confirmUrl', () => {
  it('construye el enlace a /auth/confirm sobre la URL base', () => {
    expect(confirmUrl('https://sce.example')).toBe('https://sce.example/auth/confirm')
  })

  it('añade next solo si es una ruta interna', () => {
    expect(confirmUrl('https://sce.example', '/nueva-contrasena')).toBe(
      'https://sce.example/auth/confirm?next=%2Fnueva-contrasena',
    )
    expect(confirmUrl('https://sce.example', '//evil.com')).toBe('https://sce.example/auth/confirm')
  })
})
