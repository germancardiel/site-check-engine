import { readFileSync } from 'node:fs'
import type { LookupAddress } from 'node:dns'
import { isIP, type LookupFunction } from 'node:net'
import { vi } from 'vitest'
import { parseHtml } from '../../parse'
import { extractJsonLdInfo, extractVisibleText, sentences, words } from '../../text'
import type { AuditContext, CheckResult, LookupFn, Transport, TransportInit } from '../../types'
import { runChecks } from '../../checks'
import { PAGE_URL, PUBLIC_IP } from './urls'

const PROSE =
  'Entreno a personas en Lleida para que ganen fuerza y salud. Cada plan se adapta a tu nivel y a tu horario. Revisamos la técnica en cada sesión y ajustamos las cargas cada semana. '

export const PERFECT_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Entrenador personal en Lleida | Fuerza y salud</title>
  <meta name="description" content="Entrenamiento personal en Lleida para ganar fuerza y salud con un plan adaptado a ti. Primera sesión de valoración sin compromiso." />
  <meta name="author" content="Ana García" />
  <link rel="canonical" href="https://example.com/entrenador-personal" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="alternate" hreflang="es" href="https://example.com/entrenador-personal" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/entrenador-personal" />
  <link rel="preconnect" href="https://cdn.example.org" crossorigin />
  <meta property="og:title" content="Entrenador personal en Lleida" />
  <meta property="og:description" content="Fuerza y salud con un plan a tu medida." />
  <meta property="og:image" content="https://example.com/og.jpg" />
  <meta property="og:url" content="https://example.com/entrenador-personal" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'Ana Fit', url: 'https://example.com' },
      {
        '@type': 'ExerciseGym',
        name: 'Ana Fit',
        logo: 'https://example.com/logo.png',
        sameAs: ['https://instagram.com/anafit', 'https://linkedin.com/in/anafit'],
        telephone: '+34 600 000 000',
        address: { '@type': 'PostalAddress', addressLocality: 'Lleida' },
        about: { '@type': 'Thing', name: 'Entrenamiento personal' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '42' },
      },
      {
        '@type': 'Article',
        headline: 'Entrenador personal en Lleida',
        image: 'https://example.com/og.jpg',
        datePublished: '2026-01-10',
        dateModified: '2026-02-01',
        author: { '@type': 'Person', name: 'Ana García' },
      },
      {
        '@type': 'Product',
        name: 'Plan de entrenamiento',
        image: 'https://example.com/og.jpg',
        offers: { '@type': 'Offer', price: '80', priceCurrency: 'EUR' },
      },
      {
        '@type': 'VideoObject',
        name: 'Presentación',
        description: 'Cómo entrenamos',
        thumbnailUrl: 'https://example.com/og.jpg',
        uploadDate: '2026-01-10',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://example.com/' },
          { '@type': 'ListItem', position: 2, name: 'Entrenador personal' },
        ],
      },
    ],
  })}</script>
  <link rel="stylesheet" href="/styles/main.css" />
  <script src="https://cdn.example.org/analytics.js" defer></script>
</head>
<body>
  <a href="#main">Saltar al contenido</a>
  <header><nav><a href="/">Inicio</a> <a href="/sobre-mi">Sobre mí</a> <a href="/contacto">Contacto</a></nav></header>
  <main id="main" toolname="reserva-sesion">
    <nav aria-label="Breadcrumb"><ol><li><a href="/">Inicio</a></li><li>Entrenador personal</li></ol></nav>
    <article>
      <h1>Entrenador personal en Lleida</h1>
      <img src="/img/entrenamiento-fuerza-lleida.jpg" alt="Sesión de fuerza" width="800" height="600" fetchpriority="high" />
      <img src="/img/calentamiento-movilidad.jpg" alt="Calentamiento" width="800" height="600" />
      <img src="/img/estiramientos-finales.jpg" alt="Estiramientos" width="800" height="600" />
      <img src="/img/plan-semanal-lleida.jpg" alt="Plan semanal" width="800" height="600" loading="lazy" />
      <h2>Cómo trabajo</h2>
      <p>${PROSE.repeat(8)}</p>
      <video preload="none" src="/video/intro.mp4"></video>
      <iframe title="Vídeo de presentación" src="https://www.youtube.com/embed/123" loading="lazy"></iframe>
      <h3>Primera sesión</h3>
      <p>${PROSE.repeat(4)}</p>
      <table>
        <tr><th>Plan</th><th>Sesiones</th></tr>
        <tr><td>Inicial</td><td>2 por semana</td></tr>
      </table>
      <h2>Contacto</h2>
      <p>Llámame al 600 123 456. Calle Mayor 12, 25001 Lleida. NIF 12345678Z.</p>
      <form><label for="email">Email</label><input id="email" type="email" /><button type="submit">Enviar</button></form>
    </article>
  </main>
  <footer><a href="/aviso-legal">Aviso legal</a> <a href="/privacidad">Política de privacidad</a></footer>
</body>
</html>`

export function readFixture(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')
}

export function makeCtx(html: string = PERFECT_HTML, overrides: Partial<AuditContext> = {}): AuditContext {
  const $ = parseHtml(html)
  const { visible, prose } = extractVisibleText($)
  const url = overrides.url ?? new URL('https://example.com/entrenador-personal')
  const basePage = {
    url: url.href,
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-encoding': 'br',
      'cache-control': 'public, max-age=0, must-revalidate',
      'strict-transport-security': 'max-age=63072000',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'self'; frame-ancestors 'self'",
      'x-frame-options': 'SAMEORIGIN',
    },
    body: html,
    bytes: Buffer.byteLength(html, 'utf8'),
    ttfbMs: 120,
    redirects: [],
  }
  return {
    inputUrl: url.href,
    url,
    page: overrides.page ? { ...basePage, ...overrides.page } : basePage,
    $,
    robots: { found: true, status: 200, text: 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml' },
    sitemap: {
      declaredInRobots: true,
      urls: [url.href],
      checked: ['https://example.com/sitemap.xml'],
      found: true,
      containsUrl: true,
    },
    llmsTxt: { found: true, url: 'https://example.com/llms.txt' },
    tls: { validTo: null, daysLeft: 80, issuer: "Let's Encrypt", alpn: 'h2', authorized: true },
    psi: {
      lcpMs: 1700,
      cls: 0,
      tbtMs: 50,
      unusedJsBytes: 0,
      unusedJsScore: 1,
      field: { lcpMs: 1600, cls: 0.02, inpMs: 120, origin: 'url' },
    },
    botProbes: [
      { bot: 'GPTBot', status: 200 },
      { bot: 'ClaudeBot', status: 200 },
    ],
    jsonLd: extractJsonLdInfo($),
    text: { visible, words: words(visible).length, sentences: sentences(prose) },
    ...overrides,
  }
}

export function resultsFor(html: string = PERFECT_HTML, overrides: Partial<AuditContext> = {}): Record<string, CheckResult> {
  return Object.fromEntries(runChecks(makeCtx(html, overrides)).map((r) => [r.id, r]))
}

export function buildContext(fixture: string, overrides: Partial<AuditContext> = {}): AuditContext {
  const html = fixture.endsWith('.html') ? readFixture(fixture) : fixture
  return makeCtx(html, { url: new URL(PAGE_URL), ...overrides })
}

/** DNS mock: every hostname resolves to `addresses` (a public IP by default). */
export function mockLookup(addresses: string[] = [PUBLIC_IP]) {
  return vi.fn<LookupFn>(async () =>
    addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })),
  )
}

export function htmlResponse(
  body: string,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/html', ...headers } })
}

export function redirectResponse(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } })
}

/** Resolves through a Node-style `lookup` as a socket would (`all: true`, as with autoSelectFamily). */
export function resolveAll(lookup: LookupFunction, hostname: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    lookup(hostname, { all: true }, (error, addresses) => {
      if (error) reject(error)
      else resolve((addresses as LookupAddress[]).map(({ address }) => address))
    })
  })
}

export type TransportHandler = (url: string, init: TransportInit) => Response | Promise<Response>

/**
 * Transport mock that behaves like a Node socket: hostnames are resolved only through the
 * `lookup` that `safeFetch` passes in (IP literals are not resolved, as in `net.connect`).
 * `connected` records the address each request would have connected to.
 */
export function mockTransport(handler: TransportHandler = () => htmlResponse('ok')) {
  const connected: string[] = []
  const transport = vi.fn<Transport>(async (url, init) => {
    const hostname = new URL(url).hostname.replace(/^\[|\]$/g, '')
    const [address] = isIP(hostname) ? [hostname] : await resolveAll(init.lookup, hostname)
    connected.push(address)
    return handler(url, init)
  })
  return Object.assign(transport, { connected })
}
