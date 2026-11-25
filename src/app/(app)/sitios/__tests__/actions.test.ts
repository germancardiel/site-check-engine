import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SITE_ID,
  callsOf,
  form,
  from,
  getUser,
  queueResults,
  revalidatePath,
  signOut,
  signedIn,
  signedOut,
  resetHarness,
} from './harness'

vi.mock('@/lib/supabase/server', async () => {
  const h = await import('./harness')
  return {
    createClient: vi.fn(async () => ({ auth: { getUser: h.getUser, signOut: h.signOut }, from: h.from, rpc: h.rpc })),
  }
})
vi.mock('next/navigation', async () => ({ redirect: (await import('./harness')).redirect }))
vi.mock('next/cache', async () => ({ revalidatePath: (await import('./harness')).revalidatePath }))
vi.mock('@/lib/audit', async () => ({ runAudit: (await import('./harness')).runAudit }))

import { createSite, deleteSite, logout } from '../actions'

beforeEach(resetHarness)

describe('logout', () => {
  it('cierra la sesión del usuario y redirige a /login', async () => {
    signedIn()
    signOut.mockResolvedValue({ error: null })
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('redirige a /login sin llamar a signOut si no hay sesión', async () => {
    signedOut()
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(signOut).not.toHaveBeenCalled()
  })

  it('registra el error de Supabase y redirige igualmente', async () => {
    signedIn()
    signOut.mockResolvedValue({ error: { message: 'boom' } })
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(console.error).toHaveBeenCalledWith('[logout]', { message: 'boom' })
  })
})

describe('createSite', () => {
  it('no llama a Supabase si la URL es inválida', async () => {
    const result = await createSite({}, form({ url: 'ftp://ejemplo.com' }))
    expect(result).toEqual({ error: 'Solo se admiten direcciones http:// o https://.' })
    expect(getUser).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('no inserta si no hay sesión', async () => {
    signedOut()
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' })
    expect(from).not.toHaveBeenCalled()
  })

  it('inserta la URL normalizada con el user_id de la sesión y revalida /sitios', async () => {
    signedIn()
    queueResults('sites', { error: null })
    const result = await createSite({}, form({ url: 'Ejemplo.com/#x', name: ' Mi web ' }))
    expect(result).toEqual({ message: 'Sitio añadido.' })
    expect(callsOf('sites')).toEqual([
      { method: 'insert', args: [{ user_id: 'user-1', url: 'https://ejemplo.com', name: 'Mi web' }] },
    ])
    expect(revalidatePath).toHaveBeenCalledWith('/sitios')
  })

  it('devuelve "Ya tienes este sitio." si la URL está duplicada (23505)', async () => {
    signedIn()
    queueResults('sites', { error: { code: '23505', message: 'duplicate key value' } })
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({ error: 'Ya tienes este sitio.' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('devuelve un error genérico y lo registra si Supabase falla', async () => {
    signedIn()
    const dbError = { code: '42501', message: 'permission denied for table sites' }
    queueResults('sites', { error: dbError })
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({ error: 'No se pudo guardar el sitio. Inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalledWith('[createSite]', dbError)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('deleteSite', () => {
  it('no llama a Supabase si el id no es un uuid', async () => {
    const result = await deleteSite({}, form({ id: 'abc' }))
    expect(result).toEqual({ error: 'El sitio no es válido.' })
    expect(getUser).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('no borra si no hay sesión', async () => {
    signedOut()
    const result = await deleteSite({}, form({ id: SITE_ID }))
    expect(result).toEqual({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' })
    expect(from).not.toHaveBeenCalled()
  })

  it('borra filtrando por id y por user_id y revalida /sitios', async () => {
    signedIn()
    queueResults('sites', { error: null })
    const result = await deleteSite({}, form({ id: SITE_ID }))
    expect(result).toEqual({ message: 'Sitio borrado.' })
    expect(callsOf('sites')).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', SITE_ID] },
      { method: 'eq', args: ['user_id', 'user-1'] },
    ])
    expect(revalidatePath).toHaveBeenCalledWith('/sitios')
  })

  it('devuelve un error genérico y lo registra si Supabase falla', async () => {
    signedIn()
    queueResults('sites', { error: { message: 'boom' } })
    const result = await deleteSite({}, form({ id: SITE_ID }))
    expect(result).toEqual({ error: 'No se pudo borrar el sitio. Inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalledWith('[deleteSite]', { message: 'boom' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
