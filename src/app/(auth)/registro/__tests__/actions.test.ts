import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { signUp, resend, redirect } = vi.hoisted(() => ({
  signUp: vi.fn(),
  resend: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signUp, resend } })),
}))
vi.mock('next/navigation', () => ({ redirect }))

import { register, resendConfirmation } from '../actions'

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
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sce.example')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('no llama a Supabase si la contraseña es corta', async () => {
    await expect(register({}, form('ana@example.com', '1234567'))).resolves.toEqual({
      error: 'La contraseña debe tener al menos 8 caracteres.',
      values: { email: 'ana@example.com' },
    })
    expect(signUp).not.toHaveBeenCalled()
  })

  it('no llama a Supabase si el email es inválido', async () => {
    await expect(register({}, form('ana', '12345678'))).resolves.toEqual({
      error: 'Introduce un email válido.',
      values: { email: 'ana' },
    })
    expect(signUp).not.toHaveBeenCalled()
  })

  it('devuelve un error genérico si Supabase falla', async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 422 },
    })
    const result = await register({}, form('ana@example.com', '12345678'))
    expect(result).toEqual({
      error: 'No se pudo crear la cuenta. Inténtalo de nuevo más tarde.',
      values: { email: 'ana@example.com' },
    })
    expect(console.error).toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('sin sesión devuelve el email al que se envió la confirmación (CA4)', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null })
    await expect(register({}, form(' Ana@Example.com ', '12345678'))).resolves.toEqual({
      sentTo: 'ana@example.com',
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('pasa emailRedirectTo a /auth/confirm sobre NEXT_PUBLIC_SITE_URL (CA4)', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null })
    await register({}, form('ana@example.com', '12345678'))
    expect(signUp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: '12345678',
      options: { emailRedirectTo: 'https://sce.example/auth/confirm' },
    })
  })

  it('redirige a /sitios si el registro abre sesión', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 't' } },
      error: null,
    })
    await expect(register({}, form('ana@example.com', '12345678'))).rejects.toThrow(
      'NEXT_REDIRECT:/sitios',
    )
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com', password: '12345678' }))
  })
})

function emailForm(email?: string): FormData {
  const data = new FormData()
  if (email !== undefined) data.set('email', email)
  return data
}

describe('resendConfirmation', () => {
  beforeEach(() => {
    resend.mockReset()
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sce.example')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('no llama a Supabase si el email es inválido o falta', async () => {
    await expect(resendConfirmation({}, emailForm('ana'))).resolves.toEqual({ error: 'Introduce un email válido.' })
    await expect(resendConfirmation({}, emailForm())).resolves.toEqual({ error: 'Introduce un email válido.' })
    expect(resend).not.toHaveBeenCalled()
  })

  it('reenvía el correo de registro con emailRedirectTo', async () => {
    resend.mockResolvedValue({ data: {}, error: null })
    await expect(resendConfirmation({}, emailForm(' Ana@Example.com '))).resolves.toEqual({
      message: 'Te hemos enviado otro correo. Puede tardar unos minutos en llegar.',
    })
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'ana@example.com',
      options: { emailRedirectTo: 'https://sce.example/auth/confirm' },
    })
  })

  it('devuelve un error genérico si Supabase falla', async () => {
    resend.mockResolvedValue({ data: {}, error: { code: 'over_email_send_rate_limit', message: 'rate limit' } })
    const result = await resendConfirmation({}, emailForm('ana@example.com'))
    expect(result).toEqual({ error: 'No se pudo reenviar el correo. Espera un minuto e inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalled()
  })
})
