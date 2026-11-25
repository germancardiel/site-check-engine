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

function form(email: string, password: string): FormData {
  const data = new FormData()
  data.set('email', email)
  data.set('password', password)
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
    })
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('no llama a Supabase si falta la contraseña', async () => {
    await expect(login({}, form('ana@example.com', ''))).resolves.toEqual({
      error: 'Introduce tu contraseña.',
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
})
