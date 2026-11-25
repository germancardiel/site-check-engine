import http from 'node:http'
import https from 'node:https'
import { isIP } from 'node:net'
import { Readable, type Transform, pipeline } from 'node:stream'
import zlib from 'node:zlib'
import type { Transport, TransportInit } from './types'

type RequestFn = (options: https.RequestOptions) => http.ClientRequest

export type NodeTransportDeps = {
  httpRequest?: RequestFn
  httpsRequest?: RequestFn
}

const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304])

/** Options for `http(s).request`: the socket resolves the host only through `init.lookup`. */
export function buildRequestOptions(url: URL, init: TransportInit): https.RequestOptions {
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const options: https.RequestOptions = {
    protocol: url.protocol,
    hostname,
    port: url.port || undefined,
    path: `${url.pathname}${url.search}`,
    method: 'GET',
    headers: { 'accept-encoding': 'br, gzip, deflate', ...init.headers, host: url.host },
    lookup: init.lookup,
    signal: init.signal,
    // A fresh agent per request: no pooled socket is reused across hosts or validations.
    agent: false,
  }
  // TLS is validated against the hostname (SNI + certificate), never against the IP.
  if (url.protocol === 'https:' && !isIP(hostname)) options.servername = hostname
  return options
}

function toHeaders(raw: http.IncomingHttpHeaders): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item)
  }
  return headers
}

function decoderFor(encoding: string | undefined): Transform | null {
  switch (encoding?.trim().toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return zlib.createGunzip()
    case 'deflate':
      return zlib.createInflate()
    case 'br':
      return zlib.createBrotliDecompress()
    default:
      return null
  }
}

/** Converts a Node response into a web `Response`, decompressing it like `fetch` would. */
export function toWebResponse(res: http.IncomingMessage): Response {
  const status = res.statusCode ?? 0
  const headers = toHeaders(res.headers)
  if (NULL_BODY_STATUSES.has(status)) {
    res.destroy()
    return new Response(null, { status, headers })
  }
  const decoder = decoderFor(res.headers['content-encoding'])
  // Decoding errors surface through the decoder stream, which `pipeline` destroys.
  const source: Readable = decoder ? pipeline(res, decoder, () => {}) : res
  return new Response(Readable.toWeb(source) as ReadableStream<Uint8Array>, { status, headers })
}

/**
 * Transport over `node:http`/`node:https` with the validating `lookup` (D-SEC-05). It never
 * follows redirects: `safeFetch` handles and revalidates every hop.
 */
export function createNodeTransport(deps: NodeTransportDeps = {}): Transport {
  const httpRequest = deps.httpRequest ?? ((options) => http.request(options))
  const httpsRequest = deps.httpsRequest ?? ((options) => https.request(options))
  return (rawUrl, init) =>
    new Promise<Response>((resolve, reject) => {
      const url = new URL(rawUrl)
      const send = url.protocol === 'https:' ? httpsRequest : httpRequest
      const req = send(buildRequestOptions(url, init))
      req.once('error', reject)
      req.once('response', (res) => {
        try {
          resolve(toWebResponse(res))
        } catch (error) {
          res.destroy()
          reject(error)
        }
      })
      req.end()
    })
}

export const nodeTransport: Transport = createNodeTransport()
