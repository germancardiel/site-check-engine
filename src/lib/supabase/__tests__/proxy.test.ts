import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }
type CookieMethods = {
  getAll: () => { name: string; value: string }[]
  setAll: (cookies: CookieToSet[], headers: Record<string, string>) => void
}
type FakeUser = { id: string; email: string } | null

const state = vi.hoisted(() => ({
  user: null as FakeUser,
  refreshed: [] as CookieToSet[],
  methods: null as CookieMethods | null,
}))

const { createServerClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn(async () => {
    if (state.refreshed.length > 0 && state.methods) {
      state.methods.setAll(state.refreshed, { 'Cache-Control': 'private, no-store' })
    }
    return { data: { user: state.user }, error: null }
  })
  const createServerClient = vi.fn(
    (_url: string, _key: string, options: { cookies: CookieMethods }) => {
      state.methods = options.cookies
      return { auth: { getUser } }
    },
  )
  return { createServerClient, getUser }
})

vi.mock('@supabase/ssr', () => ({ createServerClient }))

import { PRIVATE_PREFIXES, getAuthRedirect, updateSession } from '@/lib/supabase/proxy'

function request(path: string, cookie?: string): NextRequest {
  const headers = cookie ? { cookie } : undefined
  return new NextRequest(new URL(path, 'http://faro.test'), { headers })
}

describe('getAuthRedirect', () => {
  it('manda a /login a un usuario sin sesión en una ruta privada', () => {
    expect(getAuthRedirect('/sitios', false)).toBe('/login')
    expect(getAuthRedirect('/sitios/123', false)).toBe('/login')
  })

  it('deja pasar a un usuario con sesión en una ruta privada', () => {
    expect(getAuthRedirect('/sitios', true)).toBeNull()
  })

  it('manda a /sitios a un usuario con sesión en /login o /registro', () => {
    expect(getAuthRedirect('/login', true)).toBe('/sitios')
    expect(getAuthRedirect('/registro', true)).toBe('/sitios')
  })

  it('deja ver la landing con y sin sesión (un usuario con sesión no se redirige)', () => {
    expect(getAuthRedirect('/', false)).toBeNull()
    expect(getAuthRedirect('/', true)).toBeNull()
  })

  it('deja acceder sin sesión a robots.txt, sitemap.xml, llms.txt y la imagen Open Graph', () => {
    for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/opengraph-image', '/opengraph-image/abc123']) {
      expect(getAuthRedirect(path, false)).toBeNull()
      expect(getAuthRedirect(path, true)).toBeNull()
    }
  })

  it('no trata como privadas rutas que solo comparten prefijo con una privada o un archivo público', () => {
    expect(getAuthRedirect('/sitiosx', false)).toBeNull()
    expect(getAuthRedirect('/llms.txt-privado', false)).toBeNull()
    expect(getAuthRedirect('/opengraph-images', false)).toBeNull()
  })

  it('deja ver /login y /registro sin sesión', () => {
    expect(getAuthRedirect('/login', false)).toBeNull()
    expect(getAuthRedirect('/registro', false)).toBeNull()
  })

  it('deja la portada pública con y sin sesión', () => {
    expect(getAuthRedirect('/', false)).toBeNull()
    expect(getAuthRedirect('/', true)).toBeNull()
  })

  it('no confunde rutas que solo comparten prefijo con /login', () => {
    expect(getAuthRedirect('/loginx', false)).toBeNull()
    expect(getAuthRedirect('/loginx', true)).toBeNull()
  })

  it('deja llegar a Next (404) cualquier ruta desconocida, con o sin sesión', () => {
    for (const path of ['/no-existe-xyz', '/admin', '/api/secreto', '/a/b/c']) {
      expect(getAuthRedirect(path, false)).toBeNull()
      expect(getAuthRedirect(path, true)).toBeNull()
    }
  })

  it('protege todo lo que cuelga de un prefijo privado, a cualquier profundidad', () => {
    for (const path of ['/sitios/', '/sitios/abc/auditorias/def', '/sitios/abc?x=1']) {
      expect(getAuthRedirect(path, false)).toBe('/login')
    }
  })

  it('no deja esquivar la protección con mayúsculas, escapes ni barras duplicadas', () => {
    for (const path of ['/SITIOS', '/Sitios/abc', '/%73itios', '/sitios%2Fabc', '//sitios', '/sitios//abc']) {
      expect(getAuthRedirect(path, false)).toBe('/login')
    }
  })

  it('no falla con escapes mal formados', () => {
    expect(getAuthRedirect('/%E0%A4%A', false)).toBeNull()
    expect(getAuthRedirect('/sitios/%E0%A4%A', false)).toBe('/login')
  })
})

describe('PRIVATE_PREFIXES', () => {
  it('incluye cada carpeta de primer nivel de src/app/(app)/ (guardián)', () => {
    const appDir = fileURLToPath(new URL('../../../app/(app)/', import.meta.url))
    const folders = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `/${entry.name}`)
    expect(folders.length).toBeGreaterThan(0)
    for (const folder of folders) {
      expect(PRIVATE_PREFIXES, `Falta ${folder} en PRIVATE_PREFIXES`).toContain(folder)
    }
  })
})

describe('updateSession', () => {
  beforeEach(() => {
    state.user = null
    state.refreshed = []
    state.methods = null
    createServerClient.mockClear()
    getUser.mockClear()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('consulta la sesión con getUser en cada petición', async () => {
    await updateSession(request('/'))
    expect(createServerClient).toHaveBeenCalledWith(
      'http://supabase.test',
      'anon-key',
      expect.objectContaining({ cookies: expect.any(Object) }),
    )
    expect(getUser).toHaveBeenCalledTimes(1)
  })

  it('lee las cookies de la petición', async () => {
    await updateSession(request('/', 'sb-token=abc'))
    expect(state.methods?.getAll()).toEqual([{ name: 'sb-token', value: 'abc' }])
  })

  it('deja pasar sin redirigir una ruta desconocida sin sesión (Next responde 404)', async () => {
    const response = await updateSession(request('/no-existe-xyz'))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('redirige a /login sin sesión en /sitios', async () => {
    const response = await updateSession(request('/sitios?x=1'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://faro.test/login')
  })

  it('redirige a /sitios con sesión en /login', async () => {
    state.user = { id: 'u1', email: 'ana@example.com' }
    const response = await updateSession(request('/login'))
    expect(response.headers.get('location')).toBe('http://faro.test/sitios')
  })

  it('deja pasar con sesión en /sitios', async () => {
    state.user = { id: 'u1', email: 'ana@example.com' }
    const response = await updateSession(request('/sitios'))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('escribe en la respuesta las cookies refrescadas y las cabeceras de caché', async () => {
    state.user = { id: 'u1', email: 'ana@example.com' }
    state.refreshed = [{ name: 'sb-token', value: 'nuevo', options: { path: '/' } }]
    const response = await updateSession(request('/sitios', 'sb-token=viejo'))
    expect(response.cookies.get('sb-token')?.value).toBe('nuevo')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('conserva las cookies refrescadas en una redirección', async () => {
    state.refreshed = [{ name: 'sb-token', value: '', options: { path: '/', maxAge: 0 } }]
    const response = await updateSession(request('/sitios', 'sb-token=caducado'))
    expect(response.headers.get('location')).toBe('http://faro.test/login')
    expect(response.cookies.get('sb-token')?.value).toBe('')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
