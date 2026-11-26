import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { resetPasswordForEmail } = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { resetPasswordForEmail } })),
}))

import { requestPasswordReset } from '../actions'

const SENT = 'Si existe una cuenta con ese email, te hemos enviado un enlace.'

function form(email?: string): FormData {
  const data = new FormData()
  if (email !== undefined) data.set('email', email)
  return data
}

describe('requestPasswordReset (CA1)', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset()
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sce.example')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('valida el email con zod y no llama a Supabase si es inválido, conservando lo escrito', async () => {
    await expect(requestPasswordReset({}, form('ana@'))).resolves.toEqual({
      fieldErrors: { email: 'Introduce un email válido.' },
      values: { email: 'ana@' },
    })
    await expect(requestPasswordReset({}, form())).resolves.toEqual({
      fieldErrors: { email: 'Introduce un email válido.' },
      values: {},
    })
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('sin error de Supabase muestra el mensaje común y envía el enlace a /auth/confirm?next=/nueva-contrasena', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    await expect(requestPasswordReset({}, form(' Ana@Example.com '))).resolves.toEqual({ message: SENT })
    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com', {
      redirectTo: 'https://sce.example/auth/confirm?next=%2Fnueva-contrasena',
    })
  })

  it('con error de Supabase (p. ej. cuenta inexistente o límite) muestra el mismo mensaje y registra el error', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'user_not_found', message: 'User not found', status: 400 },
    })
    const result = await requestPasswordReset({}, form('nadie@example.com'))
    expect(result).toEqual({ message: SENT })
    expect(console.error).toHaveBeenCalled()
  })
})
