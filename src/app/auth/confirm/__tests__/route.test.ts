import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { verifyOtp, exchangeCodeForSession, createClient, redirect } = vi.hoisted(() => {
  const verifyOtp = vi.fn()
  const exchangeCodeForSession = vi.fn()
  return {
    verifyOtp,
    exchangeCodeForSession,
    createClient: vi.fn(async () => ({ auth: { verifyOtp, exchangeCodeForSession } })),
    redirect: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`)
    }),
  }
})

vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('next/navigation', () => ({ redirect }))

import { GET } from '../route'

function get(query: string) {
  return GET(new NextRequest(new URL(`/auth/confirm${query}`, 'http://sce.test')))
}

describe('GET /auth/confirm (CA2)', () => {
  beforeEach(() => {
    verifyOtp.mockReset().mockResolvedValue({ data: {}, error: null })
    exchangeCodeForSession.mockReset().mockResolvedValue({ data: {}, error: null })
    createClient.mockClear()
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('verifica token_hash + type y redirige a /sitios sin next', async () => {
    await expect(get('?token_hash=abc&type=signup')).rejects.toThrow('NEXT_REDIRECT:/sitios')
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'abc' })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirige a next si es una ruta interna', async () => {
    await expect(get('?token_hash=abc&type=recovery&next=%2Fnueva-contrasena')).rejects.toThrow(
      'NEXT_REDIRECT:/nueva-contrasena',
    )
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc' })
  })

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '/\t/evil.com', '/.//evil.com', '/sitios/..//evil.com', '/%2E/%2Fevil.com'])(
    'ignora un next externo (%s) y va a /sitios (D-SEC-14)',
    async (next) => {
      await expect(get(`?token_hash=abc&type=signup&next=${encodeURIComponent(next)}`)).rejects.toThrow(
        'NEXT_REDIRECT:/sitios',
      )
    },
  )

  it('canjea un code PKCE y redirige a next', async () => {
    await expect(get('?code=pkce-code&next=%2Fsitios%2Fabc')).rejects.toThrow('NEXT_REDIRECT:/sitios/abc')
    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it.each([
    ['sin parámetros', ''],
    ['token_hash sin type', '?token_hash=abc'],
    ['type desconocido', '?token_hash=abc&type=admin'],
    ['token_hash vacío', '?token_hash=&type=signup'],
    ['code vacío', '?code='],
    ['error devuelto por Supabase', '?error=access_denied&error_code=otp_expired'],
  ])('con parámetros inválidos (%s) redirige a /login?error=enlace sin llamar a Supabase', async (_, query) => {
    await expect(get(query)).rejects.toThrow('NEXT_REDIRECT:/login?error=enlace')
    expect(createClient).not.toHaveBeenCalled()
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('si verifyOtp falla redirige a /login?error=enlace y registra el error', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { code: 'otp_expired', message: 'Token has expired' } })
    await expect(get('?token_hash=abc&type=signup&next=%2Fsitios%2Fabc')).rejects.toThrow(
      'NEXT_REDIRECT:/login?error=enlace',
    )
    expect(console.error).toHaveBeenCalled()
  })

  it('si el canje del code falla redirige a /login?error=enlace', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: { code: 'bad_code_verifier', message: 'x' } })
    await expect(get('?code=pkce-code')).rejects.toThrow('NEXT_REDIRECT:/login?error=enlace')
  })

  it.each([
    ['createClient', () => createClient.mockRejectedValueOnce(new Error('env'))],
    ['verifyOtp', () => verifyOtp.mockRejectedValueOnce(new Error('fetch failed'))],
  ])('si %s lanza una excepción redirige a /login?error=enlace y la registra', async (_, fail) => {
    fail()
    await expect(get('?token_hash=abc&type=signup&next=%2Fsitios%2Fabc')).rejects.toThrow(
      'NEXT_REDIRECT:/login?error=enlace',
    )
    expect(console.error).toHaveBeenCalled()
  })

  it('si exchangeCodeForSession lanza una excepción redirige a /login?error=enlace', async () => {
    exchangeCodeForSession.mockRejectedValueOnce(new Error('fetch failed'))
    await expect(get('?code=pkce-code')).rejects.toThrow('NEXT_REDIRECT:/login?error=enlace')
    expect(console.error).toHaveBeenCalled()
  })
})
