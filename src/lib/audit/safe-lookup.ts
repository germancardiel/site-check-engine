import { lookup as dnsLookup } from 'node:dns/promises'
import type { LookupOptions } from 'node:dns'
import type { LookupFunction } from 'node:net'
import { AuditFetchError } from './errors'
import { isBlockedIp } from './ip'
import type { LookupAddress, LookupFn } from './types'

export const defaultLookup: LookupFn = (hostname, options) => dnsLookup(hostname, options)

/**
 * Resolves `hostname` once and validates every address (D-SEC-05). If any of them is not
 * public the whole host is rejected, so a mixed answer can never reach the socket.
 */
export async function resolvePublicAddresses(hostname: string, lookup: LookupFn): Promise<LookupAddress[]> {
  let addresses: LookupAddress[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch (cause) {
    throw new AuditFetchError('NETWORK', `DNS lookup failed: ${hostname}`, { cause })
  }
  if (addresses.length === 0) {
    throw new AuditFetchError('NETWORK', `DNS returned no addresses: ${hostname}`)
  }
  const blocked = addresses.find(({ address }) => isBlockedIp(address))
  if (blocked) {
    throw new AuditFetchError('BLOCKED_HOST', `${hostname} resolves to blocked IP ${blocked.address}`)
  }
  return addresses
}

function requestedFamily(family: LookupOptions['family']): 0 | 4 | 6 {
  if (family === 4 || family === 'IPv4') return 4
  if (family === 6 || family === 'IPv6') return 6
  return 0
}

/**
 * Node-style `lookup` for `http.request`/`net.connect`: the socket only ever receives
 * addresses that were validated in this same resolution, so there is no second DNS query
 * that could be rebound to a private IP. Supports both signatures used by Node: `all: true`
 * (used with `autoSelectFamily`) and the single-address one.
 */
export function createSafeLookup(lookup: LookupFn): LookupFunction {
  return (hostname, options, callback) => {
    resolvePublicAddresses(hostname, lookup).then(
      (resolved) => {
        const family = requestedFamily(options.family)
        const addresses = family === 0 ? resolved : resolved.filter((entry) => entry.family === family)
        if (addresses.length === 0) {
          callback(new AuditFetchError('NETWORK', `No IPv${family} address for ${hostname}`), '')
        } else if (options.all) {
          callback(null, addresses)
        } else {
          callback(null, addresses[0].address, addresses[0].family)
        }
      },
      (error: AuditFetchError) => callback(error, ''),
    )
  }
}
