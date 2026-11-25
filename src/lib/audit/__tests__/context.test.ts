import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import {
  buildAuditContext,
  comparableUrl,
  daysUntil,
  emptyPsi,
  fetchPsi,
  probeTls,
  type TlsConnectFn,
} from '../context'
import { htmlResponse, mockLookup, mockTransport } from './fixtures/helpers'
import { PAGE_URL, SITE } from './fixtures/urls'

/** Fixed audit time: 2027-01-01 (D-QA-08, no real clock). */
const NOW = new Date('2027-01-01T00:00:00.000Z')

class FakeTlsSocket extends EventEmitter {
  authorized = true
  authorizationError: Error | undefined = undefined
  alpnProtocol: string | false = 'h2'
  cert: { valid_to?: string; issuer?: { O?: string; CN?: string } } = {
    valid_to: '2028-01-01T00:00:00.000Z',
    issuer: { O: "Let's Encrypt" },
  }
  destroy = vi.fn()
  getPeerCertificate() {
    return this.cert
  }
}

describe('context.ts — comparableUrl, emptyPsi, fetchPsi, probeTls y daysUntil', () => {
  it('comparableUrl normaliza host, barra final y hash, y devuelve la entrada si no es URL', () => {
    expect(comparableUrl('HTTPS://Example.COM/Ruta/#seccion')).toBe('https://example.com/Ruta')
    expect(comparableUrl('https://example.com/')).toBe('https://example.com/')
    expect(comparableUrl('no-es-url')).toBe('no-es-url')
  })

  it('emptyPsi construye un PsiInfo vacío con el mensaje de error', () => {
    expect(emptyPsi('Error PSI')).toEqual({
      lcpMs: null,
      cls: null,
      tbtMs: null,
      unusedJsBytes: null,
      unusedJsScore: null,
      field: { lcpMs: null, cls: null, inpMs: null, origin: null },
      error: 'Error PSI',
    })
  })

  it('fetchPsi cubre respuestas 500, originLoadingExperience y TimeoutError', async () => {
    const res500 = await fetchPsi(PAGE_URL, (async () => new Response('', { status: 500 })) as unknown as typeof fetch)
    expect(res500?.error).toBe('PageSpeed respondió 500')

    const originOnly = await fetchPsi(
      PAGE_URL,
      (async () =>
        new Response(
          JSON.stringify({
            lighthouseResult: { audits: {} },
            loadingExperience: { metrics: {} },
            originLoadingExperience: {
              metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2200 } },
            },
          }),
          { status: 200 },
        )) as unknown as typeof fetch,
    )
    expect(originOnly?.field.origin).toBe('origin')
    expect(originOnly?.field.lcpMs).toBe(2200)

    const timeoutErr = Object.assign(new Error('timeout'), { name: 'TimeoutError' })
    const resTimeout = await fetchPsi(PAGE_URL, (async () => {
      throw timeoutErr
    }) as unknown as typeof fetch)
    expect(resTimeout?.error).toBe('PageSpeed tardó demasiado')
  })

  it('probeTls devuelve null en HTTP y extrae certificado y ALPN en HTTPS (o null en error/timeout)', async () => {
    expect(await probeTls(new URL('http://example.com'), NOW)).toBeNull()

    const okSocket = new FakeTlsSocket()
    const connectOk: TlsConnectFn = (() => {
      queueMicrotask(() => okSocket.emit('secureConnect'))
      return okSocket
    }) as unknown as TlsConnectFn
    const tlsInfo = await probeTls(new URL(PAGE_URL), NOW, mockLookup(), 1000, connectOk)
    expect(tlsInfo).toMatchObject({
      validTo: '2028-01-01T00:00:00.000Z',
      daysLeft: 365,
      issuer: "Let's Encrypt",
      alpn: 'h2',
      authorized: true,
    })
    expect(okSocket.destroy).toHaveBeenCalled()

    const errSocket = new FakeTlsSocket()
    const connectErr: TlsConnectFn = (() => {
      queueMicrotask(() => errSocket.emit('error', new Error(' handshake failed ')))
      return errSocket
    }) as unknown as TlsConnectFn
    expect(await probeTls(new URL(PAGE_URL), NOW, mockLookup(), 1000, connectErr)).toBeNull()

    const timeoutSocket = new FakeTlsSocket()
    const connectTimeout: TlsConnectFn = (() => {
      queueMicrotask(() => timeoutSocket.emit('timeout'))
      return timeoutSocket
    }) as unknown as TlsConnectFn
    expect(await probeTls(new URL(PAGE_URL), NOW, mockLookup(), 1000, connectTimeout)).toBeNull()
  })

  it('daysUntil calcula los días hasta la caducidad con una fecha fija (D-QA-08)', () => {
    expect(daysUntil(new Date('2027-01-11T00:00:00.000Z'), NOW)).toBe(10)
    expect(daysUntil(new Date('2026-12-30T00:00:00.000Z'), NOW)).toBe(-2)
    expect(daysUntil(NOW, NOW)).toBe(0)
  })

  it('buildAuditContext maneja fallos en robots.txt, llms.txt y sitemaps', async () => {
    const transport = mockTransport((u) => {
      if (u.endsWith('/robots.txt')) throw new Error('network error')
      if (u.endsWith('/llms.txt')) throw new Error('network error')
      if (u.endsWith('/sitemap.xml')) return htmlResponse('no xml', { status: 404 })
      if (u.endsWith('/sitemap_index.xml')) throw new Error('network error')
      return htmlResponse('<!doctype html><html lang="es"><body><h1>Hola</h1></body></html>')
    })
    const ctx = await buildAuditContext(
      PAGE_URL,
      {
        finalUrl: PAGE_URL,
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<!doctype html><html lang="es"><body><h1>Hola</h1></body></html>',
        redirects: [],
        redirectChain: [],
        ttfbMs: 50,
      },
      { lookup: mockLookup(), transport },
    )
    expect(ctx.robots.found).toBe(false)
    expect(ctx.robots.status).toBeNull()
    expect(ctx.llmsTxt.found).toBe(false)
    expect(ctx.sitemap.found).toBe(false)
    expect(ctx.sitemap.checked).toEqual([`${SITE}/sitemap.xml`, `${SITE}/sitemap_index.xml`])
  })
})
