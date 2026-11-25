import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { parseHtml } from '../../parse'
import type { AuditContext, LookupFn } from '../../types'
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
