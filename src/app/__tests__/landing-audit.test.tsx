import { resolveRobots, resolveSitemap } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Method (CA6): the landing is rendered with its real components (root layout + page) and the
// `<head>` is generated from the same `metadata`/`viewport` exports Next uses. robots.txt,
// sitemap.xml and llms.txt come from the real route modules. Everything is served through a
// mocked socket transport + DNS lookup to `runAudit`, the same entry point the app uses (no network).

const env = vi.hoisted(() => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'http://sce.test'
  return { previous }
})

const session = vi.hoisted(() => ({ user: null as { id: string } | null, fail: false }))

vi.mock('next/font/google', () => ({
  Syne: () => ({ variable: 'font-syne' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-jakarta' }),
  Fraunces: () => ({ variable: 'font-fraunces' }),
  JetBrains_Mono: () => ({ variable: 'font-jetbrains' }),
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
import { type TransportHandler, mockLookup, mockTransport } from '@/lib/audit/__tests__/fixtures/helpers'
import { CHECK_CATALOG } from '@/lib/audit/checks'
import { parseHtml } from '@/lib/audit/parse'
import { CHECK_STATUS_LABEL } from '@/lib/audit/present'
import { buildSpecimen } from '@/lib/specimen'

const BASE = 'http://sce.test'

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
  const og = (metadata.openGraph ?? {}) as Record<string, unknown>
  const twitter = (metadata.twitter ?? {}) as Record<string, unknown>
  const authors = Array.isArray(metadata.authors) ? metadata.authors : metadata.authors ? [metadata.authors] : []
  const authorName = (authors[0] as { name?: string } | undefined)?.name ?? 'Site Check Engine'
  return [
    '<head><meta charset="utf-8"/>',
    `<meta name="viewport" content="width=${text(viewport.width)}, initial-scale=${String(viewport.initialScale)}"/>`,
    `<title>${attr(text(metadata.title))}</title>`,
    `<meta name="description" content="${attr(text(metadata.description))}"/>`,
    `<meta name="author" content="${attr(authorName)}"/>`,
    `<link rel="canonical" href="${attr(canonical)}"/>`,
    '<link rel="icon" href="/favicon.ico"/>',
    `<meta property="og:title" content="${attr(text(og.title))}"/>`,
    `<meta property="og:description" content="${attr(text(og.description))}"/>`,
    `<meta property="og:type" content="${attr(text(og.type ?? 'website'))}"/>`,
    `<meta property="og:locale" content="${attr(text(og.locale ?? 'es_ES'))}"/>`,
    `<meta property="og:url" content="${attr(canonical)}"/>`,
    // File convention `src/app/opengraph-image.tsx` → `/opengraph-image`.
    `<meta property="og:image" content="${new URL('/opengraph-image', base).toString()}"/>`,
    `<meta name="twitter:card" content="${attr(text(twitter.card ?? 'summary_large_image'))}"/>`,
    `<meta name="twitter:title" content="${attr(text(twitter.title ?? metadata.title))}"/>`,
    `<meta name="twitter:description" content="${attr(text(twitter.description ?? metadata.description))}"/>`,
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

const fetchMock = vi.fn<TransportHandler>()

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
    const type = pathname === '/' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8'
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': type,
        'content-encoding': 'br',
        'cache-control': 'public, max-age=0, must-revalidate',
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'content-security-policy': "frame-ancestors 'self'",
      },
    })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  session.user = null
  session.fail = false
  connection.resolve = false
})

afterAll(() => {
  if (env.previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = env.previous
})

describe('la landing aprueba el motor de Site Check Engine (CA6)', () => {
  it('ningún check queda en fail ni warn salvo trust.https y perf.http2 en HTTP local', async () => {
    const result = await runAudit(`${BASE}/`, { lookup: mockLookup(), transport: mockTransport(fetchMock) })
    if (result.status !== 'ok') throw new Error(`La auditoría falló: ${result.error}`)
    const failingOrWarning = result.checks
      .filter((check) => check.status === 'fail' || check.status === 'warn')
      .map((check) => check.id)
    expect(failingOrWarning.sort()).toEqual(['perf.http2', 'trust.https'])
    expect(result.aiScore).toBe(100)
  })

  it('robots.txt declara el sitemap y el sitemap incluye /, /login y /registro', async () => {
    const files = await serve()
    expect(files['/robots.txt']).toContain(`Sitemap: ${BASE}/sitemap.xml`)
    expect(files['/robots.txt']).toContain('User-Agent: GPTBot')
    for (const path of ['/', '/login', '/registro']) {
      expect(files['/sitemap.xml']).toContain(`<loc>${BASE}${path}</loc>`)
    }
    expect(files['/llms.txt']).toMatch(/^# Site Check Engine\n/)
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
    expect(h2).toEqual(['Qué revisa Site Check Engine', 'Cómo funciona', 'Empieza a auditar tu web hoy'])
    expect(page('a[href="/registro"]').first().text()).toBe('Crear cuenta gratis')
    expect(page('a[href="/login"]').first().text()).toBe('Entrar')
    expect(page('footer')).toHaveLength(1)
  })

  it('lista los 10 apartados y los checks reales del motor', () => {
    const page = $()
    const h3 = page('#que-revisa h3').map((_, el) => page(el).text()).get()
    expect(h3).toHaveLength(10)
    const items = page('#que-revisa li').map((_, el) => page(el).text()).get()
    expect(items).toContain('Datos estructurados Schema detectados')
    expect(items).toContain('Title con longitud adecuada')
    expect(items).toHaveLength(CHECK_CATALOG.length)
  })
})

describe('informe de ejemplo de la landing', () => {
  const $ = () => parseHtml(renderLanding())

  it('está etiquetado como ejemplo y muestra una selección de checks reales con su estado', () => {
    const page = $()
    const figure = page('figure[aria-labelledby="informe-ejemplo"]')
    expect(figure).toHaveLength(1)
    expect(page('#informe-ejemplo').text()).toContain('Informe de ejemplo')
    const rows = figure.find('li')
    expect(rows.length).toBeGreaterThan(10)
    const specimen = buildSpecimen()
    const byId = new Map(specimen.rows.map((r) => [r.id, r]))
    rows.each((_, row) => {
      const rowText = page(row).text()
      const matched = [...byId.values()].find((r) => rowText.includes(r.id))
      expect(matched).toBeDefined()
      expect(rowText).toContain(CHECK_STATUS_LABEL[matched!.status])
    })
  })

  it('muestra las dos notas como medidores accesibles', () => {
    const meters = $()('figure [role="meter"]')
    expect(meters.map((_, el) => $()(el).attr('aria-label')).get()).toEqual(['Nota SEO', 'Nota IA'])
    const specimen = buildSpecimen()
    expect(meters.map((_, el) => Number($()(el).attr('aria-valuenow'))).get()).toEqual([specimen.seoScore, specimen.aiScore])
  })

  it('la palabra resaltada del h1 va en la tipografía serif y no hay eyebrow sobre el h1', () => {
    const page = $()
    expect(page('h1 em').attr('class')).toContain('font-serif')
    expect(page('h1').prev().length).toBe(0)
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
