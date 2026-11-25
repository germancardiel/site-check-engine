import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuditFetchError,
  DEFAULT_MAX_BYTES,
  DEFAULT_TIMEOUT_MS,
  USER_AGENT,
  assertPublicHost,
  safeFetch,
} from '../fetcher'
import type { LookupFn } from '../types'
import { htmlResponse, mockLookup, redirectResponse } from './fixtures/helpers'
import { FTP_URL, INTERNAL_SITE, PAGE_URL, SITE, ipUrl } from './fixtures/urls'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(AuditFetchError)
  expect((error as AuditFetchError).code).toBe(code)
}

describe('safeFetch — protocolo y URL', () => {
  it('rechaza ftp://', async () => {
    await expectCode(safeFetch(FTP_URL, { lookup: mockLookup() }), 'INVALID_URL')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rechaza una URL mal formada', async () => {
    await expectCode(safeFetch('no es una url', { lookup: mockLookup() }), 'INVALID_URL')
  })
})

describe('safeFetch — hosts bloqueados (D-SEC-05)', () => {
  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '[::1]', '100.64.0.1', '0.0.0.0', '[::ffff:127.0.0.1]'])(
    'rechaza la IP literal %s sin hacer DNS ni fetch',
    async (host) => {
      const lookup = mockLookup()
      await expectCode(safeFetch(ipUrl(host), { lookup }), 'BLOCKED_HOST')
      expect(lookup).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it.each(['localhost', 'app.localhost'])('rechaza %s', async (host) => {
    await expectCode(safeFetch(ipUrl(host), { lookup: mockLookup() }), 'BLOCKED_HOST')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rechaza un hostname público que resuelve a una IP privada', async () => {
    const lookup = mockLookup(['10.0.0.5'])
    await expectCode(safeFetch(PAGE_URL, { lookup }), 'BLOCKED_HOST')
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rechaza si alguna de las IPs resueltas es privada', async () => {
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup(['93.184.216.34', 'fd00::1']) }), 'BLOCKED_HOST')
  })

  it('trata el fallo de DNS como NETWORK', async () => {
    const lookup = vi.fn<LookupFn>(async () => {
      throw new Error('ENOTFOUND')
    })
    await expectCode(safeFetch(PAGE_URL, { lookup }), 'NETWORK')
  })

  it('trata una respuesta DNS vacía como NETWORK', async () => {
    await expectCode(assertPublicHost(new URL(PAGE_URL), mockLookup([])), 'NETWORK')
  })
})

describe('safeFetch — redirecciones', () => {
  it('rechaza una redirección a una IP privada', async () => {
    fetchMock.mockResolvedValueOnce(redirectResponse(ipUrl('169.254.169.254')))
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'BLOCKED_HOST')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('revalida el DNS de cada salto', async () => {
    const lookup = vi
      .fn<LookupFn>()
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
      .mockResolvedValueOnce([{ address: '192.168.0.10', family: 4 }])
    fetchMock.mockResolvedValueOnce(redirectResponse(INTERNAL_SITE))
    await expectCode(safeFetch(PAGE_URL, { lookup }), 'BLOCKED_HOST')
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('rechaza más de 5 redirecciones', async () => {
    fetchMock.mockImplementation(async () => redirectResponse('/otra'))
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'TOO_MANY_REDIRECTS')
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('sigue hasta 5 redirecciones relativas y devuelve la URL final', async () => {
    for (let i = 1; i <= 5; i++) fetchMock.mockResolvedValueOnce(redirectResponse(`/paso-${i}`, 301))
    fetchMock.mockResolvedValueOnce(htmlResponse('<p>fin</p>'))
    const result = await safeFetch(PAGE_URL, { lookup: mockLookup() })
    expect(result.finalUrl).toBe(`${SITE}/paso-5`)
    expect(result.redirects).toHaveLength(5)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })

  it('rechaza una redirección a otro protocolo', async () => {
    fetchMock.mockResolvedValueOnce(redirectResponse('file:///etc/passwd'))
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'INVALID_URL')
  })
})

describe('safeFetch — límites', () => {
  it('lanza TIMEOUT a los 10 s', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const assertion = expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'TIMEOUT')
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await assertion
  })

  it('lanza TIMEOUT aunque la etapa no respete la señal (DNS colgado)', async () => {
    vi.useFakeTimers()
    const lookup = vi.fn<LookupFn>(() => new Promise(() => {}))
    const assertion = expectCode(safeFetch(PAGE_URL, { lookup }), 'TIMEOUT')
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS)
    await assertion
  })

  it('corta un cuerpo de más de 3 MB (sin content-length)', async () => {
    const chunk = new Uint8Array(1024 * 1024)
    let sent = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1
        controller.enqueue(chunk)
      },
    })
    fetchMock.mockResolvedValueOnce(new Response(stream, { status: 200 }))
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'TOO_LARGE')
    expect(sent).toBeLessThanOrEqual(5)
  })

  it('rechaza un content-length declarado de más de 3 MB', async () => {
    fetchMock.mockResolvedValueOnce(
      htmlResponse('x', { headers: { 'content-length': String(DEFAULT_MAX_BYTES + 1) } }),
    )
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'TOO_LARGE')
  })

  it('acepta un cuerpo de exactamente 3 MB', async () => {
    fetchMock.mockResolvedValueOnce(new Response('a'.repeat(DEFAULT_MAX_BYTES)))
    const result = await safeFetch(PAGE_URL, { lookup: mockLookup() })
    expect(result.body).toHaveLength(DEFAULT_MAX_BYTES)
  })

  it('traduce un error de red a NETWORK', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'NETWORK')
  })

  it('traduce un error inesperado al leer el cuerpo a NETWORK', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error('socket hang up'))
      },
    })
    fetchMock.mockResolvedValueOnce(new Response(stream))
    await expectCode(safeFetch(PAGE_URL, { lookup: mockLookup() }), 'NETWORK')
  })
})

describe('safeFetch — éxito', () => {
  it('devuelve finalUrl, status, headers, body y redirects', async () => {
    fetchMock.mockResolvedValueOnce(htmlResponse('<h1>Hola</h1>', { headers: { 'X-Robots-Tag': 'all' } }))
    const lookup = mockLookup()
    const result = await safeFetch(PAGE_URL, { lookup })
    expect(result).toEqual({
      finalUrl: PAGE_URL,
      status: 200,
      headers: { 'x-robots-tag': 'all', 'content-type': 'text/html' },
      body: '<h1>Hola</h1>',
      redirects: [],
    })
    const [input, init] = fetchMock.mock.calls[0]
    expect(input).toBe(PAGE_URL)
    expect(new Headers(init?.headers).get('user-agent')).toBe(USER_AGENT)
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('devuelve también respuestas no 2xx sin lanzar', async () => {
    fetchMock.mockResolvedValueOnce(htmlResponse('no encontrado', { status: 404 }))
    const result = await safeFetch(PAGE_URL, { lookup: mockLookup() })
    expect(result.status).toBe(404)
  })

  it('usa fetch y DNS inyectados', async () => {
    const injected = vi.fn<typeof fetch>(async () => htmlResponse('ok'))
    await safeFetch(PAGE_URL, { fetch: injected, lookup: mockLookup() })
    expect(injected).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
