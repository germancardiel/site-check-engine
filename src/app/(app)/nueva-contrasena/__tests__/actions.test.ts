import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUser, updateUser, redirect, auth } = vi.hoisted(() => {
  const auth = { user: { id: 'u1' } as { id: string } | null }
  return {
    auth,
    getUser: vi.fn(async () => ({ data: { user: auth.user }, error: null })),
    updateUser: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`)
    }),
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser, updateUser } })),
}))
vi.mock('next/navigation', () => ({ redirect }))

import { updatePassword } from '../actions'

function form(password?: string): FormData {
  const data = new FormData()
  if (password !== undefined) data.set('password', password)
  return data
}

describe('updatePassword (CA3)', () => {
  beforeEach(() => {
    auth.user = { id: 'u1' }
    getUser.mockClear()
    updateUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('valida la longitud igual que el registro', async () => {
    await expect(updatePassword({}, form('1234567'))).resolves.toEqual({
      fieldErrors: { password: 'La contraseña debe tener al menos 8 caracteres.' },
    })
    await expect(updatePassword({}, form('a'.repeat(73)))).resolves.toEqual({
      fieldErrors: { password: 'La contraseña no puede superar 72 caracteres.' },
    })
    await expect(updatePassword({}, form())).resolves.toEqual({
      fieldErrors: { password: 'La contraseña debe tener al menos 8 caracteres.' },
    })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('sin sesión redirige a /login sin cambiar nada', async () => {
    auth.user = null
    await expect(updatePassword({}, form('nueva-clave-1'))).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('con sesión actualiza la contraseña y redirige a /sitios', async () => {
    await expect(updatePassword({}, form('nueva-clave-1'))).rejects.toThrow('NEXT_REDIRECT:/sitios')
    expect(getUser).toHaveBeenCalled()
    expect(updateUser).toHaveBeenCalledWith({ password: 'nueva-clave-1' })
  })

  it('si Supabase falla devuelve un error genérico', async () => {
    updateUser.mockResolvedValue({ data: { user: null }, error: { code: 'weak_password', message: 'Password is weak' } })
    await expect(updatePassword({}, form('nueva-clave-1'))).resolves.toEqual({
      error: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.',
    })
    expect(console.error).toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('si la contraseña es la misma que la anterior lo explica', async () => {
    updateUser.mockResolvedValue({ data: { user: null }, error: { code: 'same_password', message: 'x' } })
    await expect(updatePassword({}, form('nueva-clave-1'))).resolves.toEqual({
      error: 'La nueva contraseña debe ser distinta de la anterior.',
    })
  })
})
