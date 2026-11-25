import { EventEmitter } from 'node:events'
import http from 'node:http'
import type { AddressInfo, LookupFunction } from 'node:net'
import { Readable } from 'node:stream'
import zlib from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuditFetchError } from '../errors'
import { createSafeLookup } from '../safe-lookup'
import { buildRequestOptions, createNodeTransport, nodeTransport } from '../transport'
import type { TransportInit } from '../types'
import { mockLookup } from './fixtures/helpers'
import { HTTP_PAGE_URL, IP_HTTPS_URL, PAGE_URL, PORT_HTTPS_URL, PUBLIC_IP } from './fixtures/urls'

const HEADERS = { 'user-agent': 'SiteCheckEngineBot/test' }

function init(lookup: LookupFunction = createSafeLookup(mockLookup())): TransportInit {
  return { headers: HEADERS, signal: new AbortController().signal, lookup }
}

class FakeRequest extends EventEmitter {
  end = vi.fn()
}

function fakeResponse(body: Buffer | string, statusCode: number, headers: http.IncomingHttpHeaders = {}) {
  return Object.assign(Readable.from([Buffer.from(body)]), { statusCode, headers }) as unknown as http.IncomingMessage
}

/** Transport whose `http(s).request` is a spy that answers with `respond()` (no sockets). */
function fakeTransport(respond: (req: FakeRequest) => void) {
  const request = vi.fn<(options: http.RequestOptions) => http.ClientRequest>(() => {
    const req = new FakeRequest()
    queueMicrotask(() => respond(req))
    return req as unknown as http.ClientRequest
  })
  return { request, transport: createNodeTransport({ httpRequest: request, httpsRequest: request }) }
}

describe('buildRequestOptions', () => {
  it('HTTPS: SNI y Host = hostname; la conexión solo resuelve con la lookup validada', () => {
    const options = init()
    expect(buildRequestOptions(new URL(PORT_HTTPS_URL), options)).toMatchObject({
      protocol: 'https:',
      hostname: 'example.com',
      port: '8443',
      path: '/ruta?q=1',
      servername: 'example.com',
      headers: { ...HEADERS, host: 'example.com:8443' },
      lookup: options.lookup,
      signal: options.signal,
      agent: false,
    })
  })

  it('HTTP: sin servername y Host sin puerto por defecto', () => {
    const options = buildRequestOptions(new URL(HTTP_PAGE_URL), init())
    expect(options.servername).toBeUndefined()
    expect(options.port).toBeUndefined()
    expect(options.headers).toMatchObject({ host: 'example.com' })
  })

  it('HTTPS a una IP literal: sin SNI (no se permite una IP como servername)', () => {
    const options = buildRequestOptions(new URL(IP_HTTPS_URL), init())
    expect(options.hostname).toBe(PUBLIC_IP)
    expect(options.servername).toBeUndefined()
  })

  it('IPv6 literal: hostname sin corchetes y Host con corchetes', () => {
    const options = buildRequestOptions(new URL('http://[2606:2800:220:1::1]:8080/'), init())
    expect(options.hostname).toBe('2606:2800:220:1::1')
    expect(options.headers).toMatchObject({ host: '[2606:2800:220:1::1]:8080' })
  })
})

describe('createNodeTransport — con request simulado', () => {
  it('pasa a https.request servername = hostname y la lookup validada, y devuelve un Response', async () => {
    const { request, transport } = fakeTransport((req) =>
      req.emit('response', fakeResponse('<p>hola</p>', 200, { 'set-cookie': ['a=1', 'b=2'], 'x-robots-tag': 'all' })),
    )
    const options = init()
    const response = await transport(PAGE_URL, options)
    const [sent] = request.mock.calls[0]
    expect(sent).toMatchObject({ servername: 'example.com', lookup: options.lookup, headers: { host: 'example.com' } })
    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('all')
    expect(response.headers.get('set-cookie')).toBe('a=1, b=2')
    expect(await response.text()).toBe('<p>hola</p>')
  })

  it.each([
    ['gzip', zlib.gzipSync],
    ['deflate', zlib.deflateSync],
    ['br', zlib.brotliCompressSync],
  ] as const)('descomprime %s como fetch', async (encoding, compress) => {
    const { transport } = fakeTransport((req) =>
      req.emit('response', fakeResponse(compress(Buffer.from('comprimido')), 200, { 'content-encoding': encoding })),
    )
    expect(await (await transport(PAGE_URL, init())).text()).toBe('comprimido')
  })

  it('un cuerpo comprimido corrupto hace fallar la lectura', async () => {
    const { transport } = fakeTransport((req) =>
      req.emit('response', fakeResponse('no es gzip', 200, { 'content-encoding': 'gzip' })),
    )
    const response = await transport(PAGE_URL, init())
    await expect(response.text()).rejects.toThrow()
  })

  it('devuelve un cuerpo vacío en estados sin cuerpo (304)', async () => {
    const res = fakeResponse('ignorado', 304, { location: '/x' })
    const { transport } = fakeTransport((req) => req.emit('response', res))
    const response = await transport(HTTP_PAGE_URL, init())
    expect(response.status).toBe(304)
    expect(response.body).toBeNull()
    expect(res.destroyed).toBe(true)
  })

  it('rechaza un estado HTTP no representable y libera la respuesta', async () => {
    const res = fakeResponse('x', 999)
    const { transport } = fakeTransport((req) => req.emit('response', res))
    await expect(transport(PAGE_URL, init())).rejects.toBeInstanceOf(RangeError)
    expect(res.destroyed).toBe(true)
  })

  it('propaga el error de la petición (p. ej. BLOCKED_HOST de la lookup)', async () => {
    const blocked = new AuditFetchError('BLOCKED_HOST', 'blocked')
    const { transport } = fakeTransport((req) => req.emit('error', blocked))
    await expect(transport(PAGE_URL, init())).rejects.toBe(blocked)
  })
})

describe('nodeTransport — sockets reales de Node, sin red externa', () => {
  let server: http.Server | undefined

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
    server = undefined
  })

  it('Node resuelve mediante la lookup propia (all: true) y no conecta si la IP es privada', async () => {
    const safe = createSafeLookup(mockLookup(['127.0.0.1']))
    const spy = vi.fn<LookupFunction>((hostname, options, callback) => safe(hostname, options, callback))
    const error = await nodeTransport('http://rebind.test/', init(spy)).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AuditFetchError)
    expect((error as AuditFetchError).code).toBe('BLOCKED_HOST')
    expect(spy).toHaveBeenCalledWith('rebind.test', expect.objectContaining({ all: true }), expect.any(Function))
  })

  it('el socket conecta a la dirección que entrega la lookup y envía Host = hostname', async () => {
    const seen: { host?: string; ua?: string } = {}
    server = http.createServer((req, res) => {
      seen.host = req.headers.host
      seen.ua = req.headers['user-agent']
      res.writeHead(200, { 'content-type': 'text/plain' }).end('local')
    })
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    // Test-only lookup: maps the reserved `.test` name to the loopback server.
    const lookup = vi.fn<LookupFunction>((_hostname, options, callback) =>
      options.all ? callback(null, [{ address: '127.0.0.1', family: 4 }]) : callback(null, '127.0.0.1', 4),
    )
    const response = await nodeTransport(`http://sce.test:${port}/`, init(lookup))
    expect(await response.text()).toBe('local')
    expect(lookup).toHaveBeenCalledWith('sce.test', expect.anything(), expect.any(Function))
    expect(seen).toEqual({ host: `sce.test:${port}`, ua: HEADERS['user-agent'] })
  })
  it('la señal de abort (timeout de safeFetch) corta la conexión', async () => {
    server = http.createServer(() => {})
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    const lookup: LookupFunction = (_hostname, _options, callback) => callback(null, [{ address: '127.0.0.1', family: 4 }])
    const controller = new AbortController()
    const pending = nodeTransport(`http://sce.test:${port}/`, { ...init(lookup), signal: controller.signal })
    setTimeout(() => controller.abort(), 20)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    server.closeAllConnections()
  })
})
