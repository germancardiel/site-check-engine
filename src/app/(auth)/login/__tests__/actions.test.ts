import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signInWithPassword, redirect } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithPassword } })),
}))
vi.mock('next/navigation', () => ({ redirect }))

import { login } from '../actions'

function form(email: string, password: string, next?: string): FormData {
  const data = new FormData()
  data.set('email', email)
  data.set('password', password)
  if (next !== undefined) data.set('next', next)
  return data
}

describe('login', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('no llama a Supabase si el email es inválido', async () => {
    await expect(login({}, form('no-es-email', 'secreto123'))).resolves.toEqual({
      error: 'Introduce un email válido.',
      values: { email: 'no-es-email' },
    })
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('no llama a Supabase si falta la contraseña', async () => {
    await expect(login({}, form('ana@example.com', ''))).resolves.toEqual({
      error: 'Introduce tu contraseña.',
      values: { email: 'ana@example.com' },
    })
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('devuelve un error genérico si Supabase falla', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    })
    const result = await login({}, form('ana@example.com', 'secreto123'))
    expect(result).toEqual({
      error: 'No se pudo iniciar sesión. Revisa el email y la contraseña.',
      values: { email: 'ana@example.com' },
    })
    expect(result.error).not.toContain('Invalid')
    expect(console.error).toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirige a /sitios si las credenciales son correctas', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await expect(login({}, form(' Ana@Example.com ', 'secreto123'))).rejects.toThrow(
      'NEXT_REDIRECT:/sitios',
    )
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'secreto123',
    })
  })

  it('con email_not_confirmed devuelve el mensaje propio y el email para reenviar (CA5)', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 },
    })
    const result = await login({}, form(' Ana@Example.com ', 'secreto123'))
    expect(result).toEqual({
      error: 'Confirma tu email antes de entrar.',
      values: { email: ' Ana@Example.com ' },
      unconfirmedEmail: 'ana@example.com',
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it.each(['invalid_credentials', 'over_request_rate_limit', undefined])(
    'con cualquier otro error (%s) mantiene el mensaje genérico (CA5)',
    async (code) => {
      signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { code, message: 'x', status: 400 },
      })
      const result = await login({}, form('ana@example.com', 'secreto123'))
      expect(result.error).toBe('No se pudo iniciar sesión. Revisa el email y la contraseña.')
      expect(result.unconfirmedEmail).toBeUndefined()
    },
  )

  it('redirige a next si es una ruta interna (CA7)', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await expect(login({}, form('ana@example.com', 'secreto123', '/sitios/abc'))).rejects.toThrow(
      'NEXT_REDIRECT:/sitios/abc',
    )
  })

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '/.//evil.com', '/sitios/..//evil.com', '/%2E/%2Fevil.com', ''])(
    'ignora un next externo o vacío (%s) y va a /sitios (CA7, D-SEC-14)',
    async (next) => {
      signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
      await expect(login({}, form('ana@example.com', 'secreto123', next))).rejects.toThrow(
        'NEXT_REDIRECT:/sitios',
      )
      expect(redirect).toHaveBeenCalledWith('/sitios')
    },
  )

  it('ignora un next que no es texto', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const data = form('ana@example.com', 'secreto123')
    data.set('next', new Blob(['/sitios/abc']))
    await expect(login({}, data)).rejects.toThrow('NEXT_REDIRECT:/sitios')
    expect(redirect).toHaveBeenCalledWith('/sitios')
  })
})
