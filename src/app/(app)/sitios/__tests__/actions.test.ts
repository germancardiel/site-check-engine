import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUser, signOut, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser, signOut } })),
}))
vi.mock('next/navigation', () => ({ redirect }))

import { logout } from '../actions'

describe('logout', () => {
  beforeEach(() => {
    getUser.mockReset()
    signOut.mockReset()
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('cierra la sesión del usuario y redirige a /login', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    signOut.mockResolvedValue({ error: null })
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('redirige a /login sin llamar a signOut si no hay sesión', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(signOut).not.toHaveBeenCalled()
  })

  it('registra el error de Supabase y redirige igualmente', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    signOut.mockResolvedValue({ error: { message: 'boom' } })
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(console.error).toHaveBeenCalledWith('[logout]', { message: 'boom' })
  })
})
