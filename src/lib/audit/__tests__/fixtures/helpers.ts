import { readFileSync } from 'node:fs'
import type { LookupAddress } from 'node:dns'
import { isIP, type LookupFunction } from 'node:net'
import { vi } from 'vitest'
import { parseHtml } from '../../parse'
import type { AuditContext, LookupFn, Transport, TransportInit } from '../../types'
import { PAGE_URL, PUBLIC_IP } from './urls'

export function readFixture(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')
}

export function buildContext(fixture: string, overrides: Partial<Omit<AuditContext, 'html'>> = {}): AuditContext {
  return {
    url: PAGE_URL,
    finalUrl: PAGE_URL,
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    html: parseHtml(readFixture(fixture)),
    robotsTxt: readFixture('robots-open.txt'),
    llmsTxt: readFixture('llms.txt'),
    sitemapFound: true,
    ...overrides,
  }
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
