import { isIPv4, isIPv6 } from 'node:net'

type Cidr4 = readonly [base: string, prefix: number]

/** IPv4 ranges that must never be fetched (RFC 6890 special-purpose and non-public). */
const BLOCKED_V4: readonly Cidr4[] = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (cloud metadata)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
]

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0)
}

function inCidr4(value: number, [base, prefix]: Cidr4): boolean {
  const size = 2 ** (32 - prefix)
  const start = ipv4ToInt(base)
  return value >= start && value < start + size
}

export function isBlockedIPv4(ip: string): boolean {
  if (!isIPv4(ip)) return true
  const value = ipv4ToInt(ip)
  return BLOCKED_V4.some((cidr) => inCidr4(value, cidr))
}

/** Expands an IPv6 address into its 8 16-bit groups. Assumes `isIPv6(ip)` is true. */
export function parseIPv6(ip: string): number[] {
  let address = ip.split('%')[0]
  const lastColon = address.lastIndexOf(':')
  const tail = address.slice(lastColon + 1)
  if (tail.includes('.')) {
    const v4 = ipv4ToInt(tail)
    address = `${address.slice(0, lastColon + 1)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`
  }
  const [head, rest] = address.split('::')
  const headGroups = head ? head.split(':') : []
  const restGroups = rest !== undefined && rest !== '' ? rest.split(':') : []
  const missing = 8 - headGroups.length - restGroups.length
  const groups = rest === undefined ? headGroups : [...headGroups, ...Array(missing).fill('0'), ...restGroups]
  return groups.map((group) => parseInt(group, 16))
}

function embeddedIPv4(high: number, low: number): string {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.')
}

/**
 * Only global unicast (2000::/3) is allowed, minus documentation and special-purpose
 * blocks. IPv4-mapped (::ffff:a.b.c.d) and 6to4 (2002::/16) addresses are checked
 * against the IPv4 rules. Everything else (::, ::1, fc00::/7, fe80::/10, ff00::/8…) is blocked.
 */
export function isBlockedIPv6(ip: string): boolean {
  if (!isIPv6(ip)) return true
  const g = parseIPv6(ip)
  const isMapped = g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff
  if (isMapped) return isBlockedIPv4(embeddedIPv4(g[6], g[7]))
  if ((g[0] & 0xe000) !== 0x2000) return true
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true // documentation
  if (g[0] === 0x2001 && g[1] < 0x0200) return true // 2001::/23 IETF special-purpose (Teredo, ORCHID…)
  if (g[0] === 0x2002) return isBlockedIPv4(embeddedIPv4(g[1], g[2])) // 6to4
  return false
}

/** Returns true when the IP is not a public unicast address. Unknown formats are blocked. */
export function isBlockedIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '')
  if (isIPv4(clean)) return isBlockedIPv4(clean)
  if (isIPv6(clean)) return isBlockedIPv6(clean)
  return true
}

/** `localhost`, `*.localhost` (with or without trailing dot). */
export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return host === 'localhost' || host.endsWith('.localhost')
}
