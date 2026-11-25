import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_ERROR_MESSAGES, runAudit } from '../index'
import { htmlResponse, mockLookup, readFixture, redirectResponse } from './fixtures/helpers'
import { PAGE_URL, SITE, ipUrl } from './fixtures/urls'

type Routes = Record<string, () => Response | Promise<Response>>

const fetchMock = vi.fn<typeof fetch>()

function route(routes: Routes) {
  fetchMock.mockImplementation(async (input) => {
    const { pathname } = new URL(String(input))
    const handler = routes[pathname]
    return handler ? handler() : htmlResponse('<!doctype html><p>404</p>', { status: 404 })
  })
}

const requestedPaths = () => fetchMock.mock.calls.map(([input]) => new URL(String(input)).pathname)

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('runAudit — éxito', () => {
  it('audita la página con robots.txt y llms.txt y devuelve notas y checks', async () => {
    route({
      '/': () => htmlResponse(readFixture('good.html')),
      '/robots.txt': () => new Response(readFixture('robots-open.txt')),
      '/llms.txt': () => new Response(readFixture('llms.txt')),
    })
    const result = await runAudit(PAGE_URL, { lookup: mockLookup() })
    expect(result).toMatchObject({ status: 'ok', score: 100, seoScore: 100, aiScore: 100 })
    if (result.status !== 'ok') throw new Error('esperaba ok')
    expect(result.checks).toHaveLength(19)
    expect(requestedPaths()).not.toContain('/sitemap.xml')
  })

  it('pide robots.txt y llms.txt del origen final tras una redirección', async () => {
    route({
      '/': () => redirectResponse('/es/'),
      '/es/': () => htmlResponse(readFixture('good.html')),
    })
    await runAudit(PAGE_URL, { lookup: mockLookup() })
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls).toContain(`${SITE}/robots.txt`)
    expect(urls).toContain(`${SITE}/llms.txt`)
  })

  it('detecta el sitemap por /sitemap.xml cuando robots.txt no lo declara', async () => {
    route({
      '/': () => htmlResponse(readFixture('good.html')),
      '/robots.txt': () => new Response('User-agent: *\nDisallow:'),
      '/sitemap.xml': () => new Response('<urlset></urlset>'),
    })
    const result = await runAudit(PAGE_URL, { lookup: mockLookup() })
    if (result.status !== 'ok') throw new Error('esperaba ok')
    expect(result.checks.find((c) => c.id === 'sitemap')?.status).toBe('pass')
    expect(result.checks.find((c) => c.id === 'llms-txt')?.status).toBe('fail')
  })

  it('trata como null los auxiliares que fallan, no son 200 o devuelven HTML', async () => {
    route({
      '/': () => htmlResponse(readFixture('good.html')),
      '/robots.txt': () => htmlResponse('<!doctype html><html></html>'),
      '/llms.txt': () => Promise.reject(new TypeError('fetch failed')),
      '/sitemap.xml': () => Promise.reject(new TypeError('fetch failed')),
    })
    const result = await runAudit(PAGE_URL, { lookup: mockLookup() })
    if (result.status !== 'ok') throw new Error('esperaba ok')
    const byId = Object.fromEntries(result.checks.map((c) => [c.id, c.status]))
    expect(byId).toMatchObject({ 'robots-txt': 'fail', 'llms-txt': 'fail', sitemap: 'fail', 'ai-crawlers': 'pass' })
    expect(result.score).toBeLessThan(100)
  })

  it('la salida encaja con la tabla audits (enteros 0–100 y checks serializables)', async () => {
    route({ '/': () => htmlResponse(readFixture('bad.html')) })
    const result = await runAudit(PAGE_URL, { lookup: mockLookup() })
    if (result.status !== 'ok') throw new Error('esperaba ok')
    for (const value of [result.score, result.seoScore, result.aiScore]) {
      expect(Number.isInteger(value) && value >= 0 && value <= 100).toBe(true)
    }
    expect(JSON.parse(JSON.stringify(result.checks))).toEqual(result.checks)
  })
})

describe('runAudit — errores', () => {
  it('devuelve error genérico si el host está bloqueado, sin lanzar', async () => {
    const result = await runAudit(ipUrl('127.0.0.1'), { lookup: mockLookup() })
    expect(result).toEqual({ status: 'error', error: AUDIT_ERROR_MESSAGES.BLOCKED_HOST })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('devuelve error si el DNS resuelve a una IP privada', async () => {
    const result = await runAudit(PAGE_URL, { lookup: mockLookup(['192.168.1.1']) })
    expect(result).toEqual({ status: 'error', error: AUDIT_ERROR_MESSAGES.BLOCKED_HOST })
  })

  it('devuelve error de URL no válida', async () => {
    expect(await runAudit('javascript:alert(1)', { lookup: mockLookup() })).toEqual({
      status: 'error',
      error: AUDIT_ERROR_MESSAGES.INVALID_URL,
    })
  })

  it('devuelve error de red y registra el detalle solo en console.error', async () => {
    fetchMock.mockRejectedValue(new TypeError('ECONNREFUSED 93.184.216.34'))
    const result = await runAudit(PAGE_URL, { lookup: mockLookup() })
    expect(result).toEqual({ status: 'error', error: AUDIT_ERROR_MESSAGES.NETWORK })
    expect(console.error).toHaveBeenCalled()
    if (result.status === 'error') expect(result.error).not.toContain('ECONNREFUSED')
  })

  it('devuelve un error genérico (UNKNOWN) ante un fallo inesperado fuera del fetcher', async () => {
    vi.resetModules()
    vi.doMock('../checks', () => ({
      runChecks: () => {
        throw new Error('boom')
      },
    }))
    const { runAudit: runAuditWithBrokenChecks } = await import('../index')
    route({ '/': () => htmlResponse(readFixture('good.html')) })
    const result = await runAuditWithBrokenChecks(PAGE_URL, { lookup: mockLookup() })
    expect(result).toEqual({ status: 'error', error: AUDIT_ERROR_MESSAGES.UNKNOWN })
    vi.doUnmock('../checks')
  })

  it('todos los mensajes de error están en español y no están vacíos', () => {
    for (const message of Object.values(AUDIT_ERROR_MESSAGES)) expect(message).toMatch(/^[A-ZÁÉÍÓÚ].+\.$/)
  })
})
