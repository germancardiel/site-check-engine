import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ALL_CHECKS } from '../checks'
import { fetchPsi } from '../context'
import { AUDIT_ERROR_MESSAGES, runAudit } from '../index'
import {
  type TransportHandler,
  htmlResponse,
  mockLookup,
  mockTransport,
  PERFECT_HTML,
  readFixture,
  redirectResponse,
} from './fixtures/helpers'
import { PAGE_URL, SITE, ipUrl } from './fixtures/urls'

type Routes = Record<string, () => Response | Promise<Response>>

// Server behind the mocked socket transport (no real network, D-TEST-04).
const fetchMock = vi.fn<TransportHandler>()
const deps = (lookup = mockLookup()) => ({ lookup, transport: mockTransport(fetchMock) })

function route(routes: Routes) {
  fetchMock.mockImplementation(async (input) => {
    const { pathname } = new URL(String(input))
    const handler = routes[pathname]
    return handler ? handler() : htmlResponse('<!doctype html><p>404</p>', { status: 404 })
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('runAudit — éxito (CA1, CA2, CA3)', () => {
  it('audita la página con robots.txt, sitemap.xml y llms.txt y devuelve las 10 categorías', async () => {
    route({
      '/': () => htmlResponse(PERFECT_HTML.replace(/https:\/\/example\.com\/entrenador-personal/g, PAGE_URL)),
      '/robots.txt': () =>
        new Response(`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml`, {
          headers: { 'content-type': 'text/plain' },
        }),
      '/sitemap.xml': () =>
        new Response(`<urlset><url><loc>${PAGE_URL}</loc></url></urlset>`, {
          headers: { 'content-type': 'application/xml' },
        }),
      '/llms.txt': () => new Response(readFixture('llms.txt'), { headers: { 'content-type': 'text/plain' } }),
    })
    const result = await runAudit(PAGE_URL, deps())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('esperaba ok')
    expect(result.checks).toHaveLength(ALL_CHECKS.length)
    expect(result.categories).toHaveLength(10)
    expect(result.checks.find((c) => c.id === 'crawl.sitemap')?.status).toBe('pass')
    expect(result.checks.find((c) => c.id === 'ai.llms')?.status).toBe('pass')
    // Sin fetchPsi inyectado en mockTransport, los checks de PSI quedan en error ("No evaluable") sin penalizar
    expect(result.checks.find((c) => c.id === 'perf.lcp')?.status).toBe('error')
  })

  it('usa fetchPsi, probeTls y probeBots inyectados en FetchDeps (CA2)', async () => {
    route({
      '/': () => htmlResponse(PERFECT_HTML.replace(/https:\/\/example\.com\/entrenador-personal/g, PAGE_URL)),
      '/robots.txt': () => new Response('User-agent: *\nDisallow:', { headers: { 'content-type': 'text/plain' } }),
      '/sitemap_index.xml': () =>
        new Response(`<sitemapindex><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap></sitemapindex>`, {
          headers: { 'content-type': 'application/xml' },
        }),
      '/sitemap-pages.xml': () =>
        new Response(`<urlset><url><loc>${PAGE_URL}</loc></url></urlset>`, {
          headers: { 'content-type': 'application/xml' },
        }),
    })
    const result = await runAudit(PAGE_URL, {
      ...deps(),
      fetchPsi: async () => ({
        lcpMs: 1800,
        cls: 0.02,
        tbtMs: 40,
        unusedJsBytes: 1024,
        unusedJsScore: 1,
        field: { lcpMs: 1700, cls: 0.01, inpMs: 90, origin: 'url' },
      }),
      probeTls: async () => ({
        validTo: '2027-01-01T00:00:00.000Z',
        daysLeft: 120,
        issuer: 'LE',
        alpn: 'h2',
        authorized: true,
      }),
      probeBots: async () => [
        { bot: 'GPTBot', status: 200 },
        { bot: 'ClaudeBot', status: 200 },
      ],
    })
    if (result.status !== 'ok') throw new Error('esperaba ok')
    expect(result.checks.find((c) => c.id === 'perf.lcp')?.status).toBe('pass')
    expect(result.checks.find((c) => c.id === 'perf.http2')?.status).toBe('pass')
    expect(result.checks.find((c) => c.id === 'ai.waf')?.status).toBe('pass')
    expect(result.checks.find((c) => c.id === 'crawl.sitemap')?.status).toBe('warn')
  })

  it('pide robots.txt y llms.txt del origen final tras una redirección y registra la cadena en crawl.status', async () => {
    route({
      '/': () => redirectResponse('/es/', 301),
      '/es/': () => htmlResponse(PERFECT_HTML),
    })
    const result = await runAudit(PAGE_URL, deps())
    if (result.status !== 'ok') throw new Error('esperaba ok')
    const statusCheck = result.checks.find((c) => c.id === 'crawl.status')
    expect(statusCheck?.status).toBe('warn')
    expect(statusCheck?.items?.[0]?.label).toContain('301')
  })

  it('la salida encaja con la tabla audits (enteros 0–100 y checks serializables)', async () => {
    route({ '/': () => htmlResponse(readFixture('bad.html')) })
    const result = await runAudit(PAGE_URL, deps())
    if (result.status !== 'ok') throw new Error('esperaba ok')
    for (const value of [result.score, result.seoScore, result.aiScore]) {
      expect(Number.isInteger(value) && value >= 0 && value <= 100).toBe(true)
    }
    expect(JSON.parse(JSON.stringify(result.checks))).toEqual(result.checks)
  })
})

describe('fetchPsi con fetch simulado (sin red real)', () => {
  it('parsea las métricas de Lighthouse y CrUX', async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          lighthouseResult: {
            audits: {
              'largest-contentful-paint': { numericValue: 2100 },
              'cumulative-layout-shift': { numericValue: 0.04 },
              'total-blocking-time': { numericValue: 80 },
              'unused-javascript': { score: 0.9, details: { overallSavingsBytes: 12000 } },
            },
          },
          loadingExperience: {
            metrics: {
              LARGEST_CONTENTFUL_PAINT_MS: { percentile: 1900 },
              CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
              INTERACTION_TO_NEXT_PAINT: { percentile: 140 },
            },
          },
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch
    const info = await fetchPsi(PAGE_URL, fakeFetch)
    expect(info).toEqual({
      lcpMs: 2100,
      cls: 0.04,
      tbtMs: 80,
      unusedJsBytes: 12000,
      unusedJsScore: 0.9,
      field: { lcpMs: 1900, cls: 0.05, inpMs: 140, origin: 'url' },
    })
  })

  it('degrada limpiamente cuando PageSpeed devuelve 429 o falla', async () => {
    const rateLimited = (async () => new Response('quota', { status: 429 })) as unknown as typeof fetch
    const res429 = await fetchPsi(PAGE_URL, rateLimited)
    expect(res429?.error).toContain('Cuota')

    const failed = (async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    const resErr = await fetchPsi(PAGE_URL, failed)
    expect(resErr?.error).toContain('no disponible')
  })
})

describe('runAudit — errores', () => {
  it('devuelve error genérico si el host está bloqueado, sin lanzar', async () => {
    const result = await runAudit(ipUrl('127.0.0.1'), deps())
    expect(result).toEqual({ status: 'error', error: AUDIT_ERROR_MESSAGES.BLOCKED_HOST })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('devuelve error si el DNS resuelve a una IP privada', async () => {
    const result = await runAudit(PAGE_URL, deps(mockLookup(['192.168.1.1'])))
    expect(result).toEqual({ status: 'error', error: AUDIT_ERROR_MESSAGES.BLOCKED_HOST })
  })

  it('devuelve error de URL no válida', async () => {
    expect(await runAudit('javascript:alert(1)', deps())).toEqual({
      status: 'error',
      error: AUDIT_ERROR_MESSAGES.INVALID_URL,
    })
  })

  it('devuelve error de red y registra el detalle solo en console.error', async () => {
    fetchMock.mockRejectedValue(new TypeError('ECONNREFUSED 93.184.216.34'))
    const result = await runAudit(PAGE_URL, deps())
    expect(result).toEqual({ status: 'error', error: AUDIT_ERROR_MESSAGES.NETWORK })
    expect(console.error).toHaveBeenCalled()
    if (result.status === 'error') expect(result.error).not.toContain('ECONNREFUSED')
  })

  it('todos los mensajes de error están en español y no están vacíos', () => {
    for (const message of Object.values(AUDIT_ERROR_MESSAGES)) expect(message).toMatch(/^[A-ZÁÉÍÓÚ].+\.$/)
  })
})
