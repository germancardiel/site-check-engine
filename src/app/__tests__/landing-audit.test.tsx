import { resolveRobots, resolveSitemap } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Method (CA2): the landing is rendered with its real components (root layout + page) and the
// `<head>` is generated from the same `metadata`/`viewport` exports Next uses. robots.txt,
// sitemap.xml and llms.txt come from the real route modules. Everything is served through a
// mocked `fetch` + DNS lookup to `runAudit`, the same entry point the app uses (no network).

const env = vi.hoisted(() => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'http://faro.test'
  return { previous }
})

const session = vi.hoisted(() => ({ user: null as { id: string } | null, fail: false }))

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
}))

// During a static render the session hole never resolves, as in Next's prerender: the shell
// shows the visitor CTAs. Individual tests resolve it to check the signed-in variant.
const connection = vi.hoisted(() => ({ resolve: false }))
vi.mock('next/server', () => ({
  connection: () => (connection.resolve ? Promise.resolve() : new Promise<void>(() => {})),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    if (session.fail) throw new Error('sin entorno')
    return { auth: { getUser: async () => ({ data: { user: session.user }, error: null }) } }
  },
}))

import RootLayout, { metadata as rootMetadata, viewport } from '@/app/layout'
import { GET as llmsTxt } from '@/app/llms.txt/route'
import * as ogImage from '@/app/opengraph-image'
import Home, { metadata as pageMetadata } from '@/app/page'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { SessionCtas } from '@/components/landing/session-ctas'
import { runAudit } from '@/lib/audit'
import { mockLookup } from '@/lib/audit/__tests__/fixtures/helpers'
import { parseHtml } from '@/lib/audit/parse'

const BASE = 'http://faro.test'

function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error(`Se esperaba un texto y llegó ${String(value)}`)
  return value
}

/** `<head>` equivalent to the one Next renders from the `metadata` and `viewport` exports. */
function renderHead(): string {
  const metadata = { ...rootMetadata, ...pageMetadata }
  const base = metadata.metadataBase
  if (!(base instanceof URL)) throw new Error('Falta metadataBase')
  const canonical = new URL(text(metadata.alternates?.canonical), base).toString()
  const og = metadata.openGraph ?? {}
  return [
    '<head><meta charset="utf-8"/>',
    `<meta name="viewport" content="width=${text(viewport.width)}, initial-scale=${String(viewport.initialScale)}"/>`,
    `<title>${attr(text(metadata.title))}</title>`,
    `<meta name="description" content="${attr(text(metadata.description))}"/>`,
    `<link rel="canonical" href="${attr(canonical)}"/>`,
    `<meta property="og:title" content="${attr(text(og.title))}"/>`,
    `<meta property="og:description" content="${attr(text(og.description))}"/>`,
    // File convention `src/app/opengraph-image.tsx` → `/opengraph-image`.
    `<meta property="og:image" content="${new URL('/opengraph-image', base).toString()}"/>`,
    '</head>',
  ].join('')
}

function renderLanding(): string {
  const document = renderToStaticMarkup(
    <RootLayout>
      <Home />
    </RootLayout>,
  )
  return `<!DOCTYPE html>${document.replace('<body', `${renderHead()}<body`)}`
}

const fetchMock = vi.fn<typeof fetch>()

async function serve(): Promise<Record<string, string>> {
  return {
    '/': renderLanding(),
    '/robots.txt': resolveRobots(robots()),
    '/sitemap.xml': resolveSitemap(sitemap()),
    '/llms.txt': await llmsTxt().text(),
  }
}

beforeEach(async () => {
  const files = await serve()
  fetchMock.mockImplementation(async (input) => {
    const { pathname } = new URL(String(input))
    const body = files[pathname]
    if (body === undefined) return new Response('<!doctype html><p>404</p>', { status: 404 })
    const type = pathname === '/' ? 'text/html' : 'text/plain'
    return new Response(body, { status: 200, headers: { 'content-type': type } })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  session.user = null
  session.fail = false
  connection.resolve = false
})

afterAll(() => {
  if (env.previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = env.previous
})

describe('la landing aprueba el motor de Faro', () => {
  it('todos los checks dan pass salvo https (en local se sirve por HTTP)', async () => {
    const result = await runAudit(`${BASE}/`, { lookup: mockLookup() })
    if (result.status !== 'ok') throw new Error(`La auditoría falló: ${result.error}`)
    const notPassing = result.checks.filter((check) => check.status !== 'pass').map((check) => check.id)
    expect(notPassing).toEqual(['https'])
    expect(result.aiScore).toBe(100)
  })

  it('robots.txt declara el sitemap y el sitemap incluye /, /login y /registro', async () => {
    const files = await serve()
    expect(files['/robots.txt']).toContain(`Sitemap: ${BASE}/sitemap.xml`)
    expect(files['/robots.txt']).toContain('User-Agent: GPTBot')
    for (const path of ['/', '/login', '/registro']) {
      expect(files['/sitemap.xml']).toContain(`<loc>${BASE}${path}</loc>`)
    }
    expect(files['/llms.txt']).toMatch(/^# Faro\n/)
  })

  it('la imagen Open Graph se genera con next/og a 1200×630', () => {
    expect(ogImage.size).toEqual({ width: 1200, height: 630 })
    expect(ogImage.contentType).toBe('image/png')
    expect(ogImage.alt.length).toBeGreaterThan(0)
  })
})

describe('estructura de la landing', () => {
  const $ = () => parseHtml(renderLanding())

  it('tiene un único h1 y un único <main id="contenido">, precedido por el enlace para saltar', () => {
    const page = $()
    expect(page('h1')).toHaveLength(1)
    expect(page('main')).toHaveLength(1)
    expect(page('main').attr('id')).toBe('contenido')
    const firstFocusable = page('a, button, input, select, textarea').first()
    expect(firstFocusable.attr('href')).toBe('#contenido')
    expect(firstFocusable.text()).toBe('Saltar al contenido')
  })

  it('tiene las secciones de la tarea y CTA a /registro y /login para visitantes', () => {
    const page = $()
    const h2 = page('h2').map((_, el) => page(el).text()).get()
    expect(h2).toEqual(['Qué revisa Faro', 'Cómo funciona', 'Empieza a auditar tu web hoy'])
    expect(page('a[href="/registro"]').first().text()).toBe('Crear cuenta gratis')
    expect(page('a[href="/login"]').first().text()).toBe('Entrar')
    expect(page('footer')).toHaveLength(1)
  })

  it('lista los checks reales del motor', () => {
    const items = $()('#que-revisa li').map((_, el) => $()(el).text()).get()
    expect(items).toContain('Datos estructurados')
    expect(items).toContain('Título de la página')
    expect(items).toHaveLength(19)
  })
})

describe('CTA según la sesión', () => {
  it('un usuario con sesión ve "Ir a tus sitios" en lugar de "Entrar" y "Crear cuenta"', async () => {
    connection.resolve = true
    session.user = { id: 'u1' }
    const html = renderToStaticMarkup(await SessionCtas())
    expect(html).toContain('href="/sitios"')
    expect(html).toContain('Ir a tus sitios')
    expect(html).not.toContain('Entrar')
    expect(html).not.toContain('Crear cuenta')
  })

  it('sin sesión, o si no se puede leer, muestra los CTA de registro y acceso', async () => {
    connection.resolve = true
    expect(renderToStaticMarkup(await SessionCtas())).toContain('Crear cuenta gratis')
    session.fail = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(renderToStaticMarkup(await SessionCtas())).toContain('Entrar')
    expect(console.error).toHaveBeenCalledWith('[LandingCtas]', expect.any(Error))
  })
})
