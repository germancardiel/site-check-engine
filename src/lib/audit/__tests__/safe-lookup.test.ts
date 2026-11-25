import type { LookupAddress, LookupOptions } from 'node:dns'
import { describe, expect, it, vi } from 'vitest'
import { AuditFetchError } from '../errors'
import { createSafeLookup, resolvePublicAddresses } from '../safe-lookup'
import type { LookupFn } from '../types'
import { mockLookup } from './fixtures/helpers'
import { PUBLIC_IP } from './fixtures/urls'

const PUBLIC_IPV6 = '2606:2800:220:1::1'

type Answer = { error: Error | null; address: string | LookupAddress[]; family?: number }

function callLookup(lookup: LookupFn, options: LookupOptions): Promise<Answer> {
  return new Promise((resolve) => {
    createSafeLookup(lookup)('example.com', options, (error, address, family) =>
      resolve({ error, address, family }),
    )
  })
}

function codeOf(error: Error | null): string | undefined {
  return error instanceof AuditFetchError ? error.code : undefined
}

describe('resolvePublicAddresses', () => {
  it('devuelve todas las direcciones si son públicas', async () => {
    const lookup = mockLookup([PUBLIC_IP, PUBLIC_IPV6])
    expect(await resolvePublicAddresses('example.com', lookup)).toEqual([
      { address: PUBLIC_IP, family: 4 },
      { address: PUBLIC_IPV6, family: 6 },
    ])
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true })
  })

  it('bloquea si una de las direcciones es privada', async () => {
    const error = await resolvePublicAddresses('example.com', mockLookup([PUBLIC_IP, '10.0.0.1'])).catch((e) => e)
    expect(codeOf(error)).toBe('BLOCKED_HOST')
  })

  it('traduce el fallo de DNS a NETWORK', async () => {
    const lookup = vi.fn<LookupFn>().mockRejectedValue(new Error('ENOTFOUND'))
    const error = await resolvePublicAddresses('example.com', lookup).catch((e) => e)
    expect(codeOf(error)).toBe('NETWORK')
  })
})

describe('createSafeLookup — firmas de Node', () => {
  it('firma all: true (autoSelectFamily): entrega la lista validada', async () => {
    const answer = await callLookup(mockLookup([PUBLIC_IP, PUBLIC_IPV6]), { all: true })
    expect(answer.error).toBeNull()
    expect(answer.address).toEqual([
      { address: PUBLIC_IP, family: 4 },
      { address: PUBLIC_IPV6, family: 6 },
    ])
  })

  it('firma de dirección única: entrega la primera dirección validada y su familia', async () => {
    const answer = await callLookup(mockLookup([PUBLIC_IP, PUBLIC_IPV6]), {})
    expect(answer).toEqual({ error: null, address: PUBLIC_IP, family: 4 })
  })

  it.each([
    [6, PUBLIC_IPV6, 6],
    ['IPv6', PUBLIC_IPV6, 6],
    [4, PUBLIC_IP, 4],
    ['IPv4', PUBLIC_IP, 4],
  ] as const)('respeta family=%s', async (family, address, expected) => {
    const answer = await callLookup(mockLookup([PUBLIC_IP, PUBLIC_IPV6]), { family })
    expect(answer).toEqual({ error: null, address, family: expected })
  })

  it('falla con NETWORK si no hay direcciones de la familia pedida', async () => {
    const answer = await callLookup(mockLookup([PUBLIC_IP]), { family: 6, all: true })
    expect(codeOf(answer.error)).toBe('NETWORK')
  })

  it.each([{ all: true }, {}])('con una IP privada falla con BLOCKED_HOST (%o)', async (options) => {
    const answer = await callLookup(mockLookup([PUBLIC_IP, '169.254.169.254']), options)
    expect(codeOf(answer.error)).toBe('BLOCKED_HOST')
    expect(answer.address).toBe('')
  })

  it('rebinding: cada llamada valida su propia respuesta (1.ª pública, 2.ª 127.0.0.1)', async () => {
    const lookup = vi
      .fn<LookupFn>()
      .mockResolvedValueOnce([{ address: PUBLIC_IP, family: 4 }])
      .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }])
    expect(await callLookup(lookup, { all: true })).toEqual({
      error: null,
      address: [{ address: PUBLIC_IP, family: 4 }],
      family: undefined,
    })
    const second = await callLookup(lookup, {})
    expect(codeOf(second.error)).toBe('BLOCKED_HOST')
    expect(second.address).not.toContain('127.0.0.1')
  })
})
