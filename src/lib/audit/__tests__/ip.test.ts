import { describe, expect, it } from 'vitest'
import { isBlockedIp, isLocalHostname, parseIPv6 } from '../ip'

describe('isBlockedIp — IPv4', () => {
  it.each([
    '0.0.0.0',
    '0.255.1.1',
    '10.0.0.1',
    '100.64.0.1',
    '100.127.255.255',
    '127.0.0.1',
    '127.255.0.9',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.8',
    '192.0.2.1',
    '192.168.1.1',
    '198.18.0.1',
    '203.0.113.7',
    '224.0.0.1',
    '239.255.255.250',
    '240.0.0.1',
    '255.255.255.255',
  ])('bloquea %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true)
  })

  it.each(['93.184.216.34', '8.8.8.8', '100.63.255.255', '100.128.0.1', '172.15.0.1', '172.32.0.1', '1.1.1.1'])(
    'permite %s',
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false)
    },
  )
})

describe('isBlockedIp — IPv6', () => {
  it.each([
    '::',
    '::1',
    '[::1]',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'fe80::1%eth0',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '::ffff:a9fe:a9fe',
    '64:ff9b::a00:1',
    '2001:db8::1',
    '2001::1',
    '2002:7f00:1::',
    '::127.0.0.1',
  ])('bloquea %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true)
  })

  it.each(['2606:4700:4700::1111', '2a00:1450:4003:80e::200e', '::ffff:93.184.216.34', '2002:5db8:d822::1'])(
    'permite %s',
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false)
    },
  )

  it('bloquea formatos desconocidos', () => {
    expect(isBlockedIp('no-es-una-ip')).toBe(true)
    expect(isBlockedIp('999.1.1.1')).toBe(true)
  })
})

describe('parseIPv6', () => {
  it('expande :: y la cola IPv4', () => {
    expect(parseIPv6('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
    expect(parseIPv6('fe80::')).toEqual([0xfe80, 0, 0, 0, 0, 0, 0, 0])
    expect(parseIPv6('::ffff:1.2.3.4')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304])
    expect(parseIPv6('1:2:3:4:5:6:7:8')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('isLocalHostname', () => {
  it.each(['localhost', 'LOCALHOST', 'localhost.', 'app.localhost', 'a.b.localhost'])('bloquea %s', (host) => {
    expect(isLocalHostname(host)).toBe(true)
  })

  it.each(['example.com', 'localhost.example.com', 'mylocalhost'])('permite %s', (host) => {
    expect(isLocalHostname(host)).toBe(false)
  })
})
