import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditFetchError, safeFetch } from '../fetcher'
import type { SafeFetchOptions } from '../types'
import { type TransportHandler, htmlResponse, mockLookup, mockTransport, redirectResponse } from './fixtures/helpers'
import { PAGE_URL } from './fixtures/urls'

// Mocked DNS and socket (D-TEST-04: no real network).
const fetchMock = vi.fn<TransportHandler>()
let transport = mockTransport(fetchMock)

function fetchWith(url: string, opts: SafeFetchOptions = {}) {
  return safeFetch(url, { transport, ...opts })
}

beforeEach(() => {
  fetchMock.mockReset()
  transport = mockTransport(fetchMock)
})

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(AuditFetchError)
  expect((error as AuditFetchError).code).toBe(code)
}

describe('safeFetch — puertos (D-SEC-11)', () => {
  it.each(['https://example.com:22/', 'http://example.com:8080/', 'http://example.com:443/', 'https://example.com:80/'])(
    'rechaza la URL inicial %s sin DNS ni socket',
    async (url) => {
      const lookup = mockLookup()
      await expectCode(fetchWith(url, { lookup }), 'BLOCKED_HOST')
      expect(lookup).not.toHaveBeenCalled()
      expect(transport).not.toHaveBeenCalled()
    },
  )

  it.each(['https://example.com:22/', 'http://example.com:8080/x'])(
    'rechaza una redirección a %s sin abrir el segundo socket',
    async (location) => {
      fetchMock.mockResolvedValueOnce(redirectResponse(location))
      const lookup = mockLookup()
      await expectCode(fetchWith(PAGE_URL, { lookup }), 'BLOCKED_HOST')
      expect(transport).toHaveBeenCalledTimes(1)
      expect(lookup).toHaveBeenCalledTimes(1)
    },
  )

  it('acepta los puertos por defecto explícitos (:443 y :80)', async () => {
    fetchMock.mockResolvedValueOnce(redirectResponse('http://example.com:80/b'))
    fetchMock.mockResolvedValueOnce(htmlResponse('<p>ok</p>'))
    const result = await fetchWith('https://example.com:443/a', { lookup: mockLookup() })
    expect(result.finalUrl).toBe('http://example.com/b')
  })
})
