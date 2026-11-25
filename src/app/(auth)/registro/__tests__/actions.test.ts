import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signUp, redirect } = vi.hoisted(() => ({
  signUp: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signUp } })),
}))
vi.mock('next/navigation', () => ({ redirect }))

import { register } from '../actions'

function form(email: string, password: string): FormData {
  const data = new FormData()
  data.set('email', email)
  data.set('password', password)
  return data
}

describe('register', () => {
  beforeEach(() => {
    signUp.mockReset()
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('no llama a Supabase si la contraseña es corta', async () => {
    await expect(register({}, form('ana@example.com', '1234567'))).resolves.toEqual({
      error: 'La contraseña debe tener al menos 8 caracteres.',
    })
    expect(signUp).not.toHaveBeenCalled()
  })

  it('no llama a Supabase si el email es inválido', async () => {
    await expect(register({}, form('ana', '12345678'))).resolves.toEqual({
      error: 'Introduce un email válido.',
    })
    expect(signUp).not.toHaveBeenCalled()
  })

  it('devuelve un error genérico si Supabase falla', async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 422 },
    })
    const result = await register({}, form('ana@example.com', '12345678'))
    expect(result).toEqual({ error: 'No se pudo crear la cuenta. Inténtalo de nuevo más tarde.' })
    expect(console.error).toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('pide confirmar el correo si Supabase no devuelve sesión', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null })
    await expect(register({}, form('ana@example.com', '12345678'))).resolves.toEqual({
      message: 'Revisa tu correo para confirmar la cuenta',
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirige a /sitios si el registro abre sesión', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 't' } },
      error: null,
    })
    await expect(register({}, form('ana@example.com', '12345678'))).rejects.toThrow(
      'NEXT_REDIRECT:/sitios',
    )
    expect(signUp).toHaveBeenCalledWith({ email: 'ana@example.com', password: '12345678' })
  })
})
