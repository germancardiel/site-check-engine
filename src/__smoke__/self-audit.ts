import { lookup } from 'node:dns'
import { isLocalHostname } from '@/lib/audit/ip'
import { nodeTransport } from '@/lib/audit/transport'
import type { FetchDeps, Transport } from '@/lib/audit'

/**
 * Public-looking hostname used to self-audit a local instance. The SSRF guard (D-SEC-05)
 * rightly refuses `localhost`, so locally Faro is audited as `http://faro-smoke.test:<port>`
 * and only that exact origin is sent to the loopback server. Build with
 * `NEXT_PUBLIC_SITE_URL=http://faro-smoke.test:<port>` so the canonical URL matches it.
 */
export const LOCAL_AUDIT_HOST = 'faro-smoke.test'

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]'])

export function isLoopbackOrigin(origin: string): boolean {
  const { hostname } = new URL(origin)
  return isLocalHostname(hostname) || LOOPBACK_HOSTS.has(hostname)
}

/**
 * Real Node transport; requests to the alias origin are rewritten to the local base URL
 * and resolved by the system DNS. Every other host keeps Faro's validating lookup.
 */
function aliasTransport(aliasOrigin: string, baseOrigin: string): Transport {
  return (rawUrl, init) => {
    const url = new URL(rawUrl)
    if (url.origin !== aliasOrigin) return nodeTransport(rawUrl, init)
    const target = new URL(`${url.pathname}${url.search}`, baseOrigin)
    return nodeTransport(target.toString(), { ...init, lookup })
  }
}

/** URL to audit and transport for the self-audit of `baseOrigin`. */
export function selfAuditTarget(baseOrigin: string): { url: string; deps: FetchDeps } {
  if (!isLoopbackOrigin(baseOrigin)) return { url: `${baseOrigin}/`, deps: {} }
  const base = new URL(baseOrigin)
  const aliasOrigin = `${base.protocol}//${LOCAL_AUDIT_HOST}${base.port ? `:${base.port}` : ''}`
  return { url: `${aliasOrigin}/`, deps: { transport: aliasTransport(aliasOrigin, baseOrigin) } }
}
