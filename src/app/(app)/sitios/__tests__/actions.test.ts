import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SITE_ID,
  callsOf,
  form,
  from,
  getUser,
  queueResults,
  redirect,
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
    expect(result).toEqual({
      fieldErrors: { url: 'Solo se admiten direcciones http:// o https://.' },
      values: { url: 'ftp://ejemplo.com' },
    })
    expect(getUser).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('no inserta si no hay sesión', async () => {
    signedOut()
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.', values: { url: 'ejemplo.com' } })
    expect(from).not.toHaveBeenCalled()
  })

  it('con URL y nombre inválidos devuelve el error de cada campo y conserva lo escrito (CA2)', async () => {
    const name = 'x'.repeat(81)
    const result = await createSite({}, form({ url: 'ejemplo.com:8080', name }))
    expect(result).toEqual({
      fieldErrors: {
        url: 'Solo se admiten los puertos por defecto (80 para http y 443 para https).',
        name: 'El nombre no puede superar 80 caracteres.',
      },
      // The echoed value is cut to the field's maximum length (T20).
      values: { url: 'ejemplo.com:8080', name: name.slice(0, 80) },
    })
    expect(getUser).not.toHaveBeenCalled()
  })

  it('inserta la URL normalizada con el user_id de la sesión, revalida /sitios y redirige al sitio nuevo (CA5)', async () => {
    signedIn()
    queueResults('sites', { data: { id: SITE_ID }, error: null })
    await expect(createSite({}, form({ url: 'Ejemplo.com/#x', name: ' Mi web ' }))).rejects.toThrow(
      `NEXT_REDIRECT:/sitios/${SITE_ID}`,
    )
    expect(redirect).toHaveBeenCalledExactlyOnceWith(`/sitios/${SITE_ID}`)
    expect(callsOf('sites')).toEqual([
      { method: 'insert', args: [{ user_id: 'user-1', url: 'https://ejemplo.com', name: 'Mi web' }] },
      { method: 'select', args: ['id'] },
      { method: 'single', args: [] },
    ])
    expect(revalidatePath).toHaveBeenCalledWith('/sitios')
    expect(revalidatePath.mock.invocationCallOrder[0]).toBeLessThan(redirect.mock.invocationCallOrder[0])
  })

  it('si algo lanza (p. ej. Supabase sin red) devuelve un error genérico y conserva lo escrito (D-UX-12)', async () => {
    const boom = new Error('fetch failed')
    getUser.mockRejectedValue(boom)
    const result = await createSite({}, form({ url: 'ejemplo.com', name: 'Mi web' }))
    expect(result).toEqual({
      error: 'No se pudo guardar el sitio. Inténtalo de nuevo.',
      values: { url: 'ejemplo.com', name: 'Mi web' },
    })
    expect(console.error).toHaveBeenCalledWith('[createSite]', boom)
    expect(redirect).not.toHaveBeenCalled()
  })

  it('devuelve "Ya tienes este sitio." si la URL está duplicada (23505)', async () => {
    signedIn()
    queueResults('sites', { error: { code: '23505', message: 'duplicate key value' } })
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({ error: 'Ya tienes este sitio.', values: { url: 'ejemplo.com' } })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('con 10 sitios, el 11.º falla en la BD y devuelve el mensaje del límite (CA5)', async () => {
    signedIn()
    queueResults('sites', { error: { code: 'P0001', message: 'site_limit_reached' } })
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({
      error: 'Has llegado al máximo de 10 sitios. Borra uno para añadir otro.',
      values: { url: 'ejemplo.com' },
    })
    expect(console.error).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('otra excepción P0001 no se confunde con el límite de sitios', async () => {
    signedIn()
    const dbError = { code: 'P0001', message: 'otra cosa' }
    queueResults('sites', { error: dbError })
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({ error: 'No se pudo guardar el sitio. Inténtalo de nuevo.', values: { url: 'ejemplo.com' } })
    expect(console.error).toHaveBeenCalledWith('[createSite]', dbError)
  })

  it('devuelve un error genérico y lo registra si Supabase falla', async () => {
    signedIn()
    const dbError = { code: '42501', message: 'permission denied for table sites' }
    queueResults('sites', { error: dbError })
    const result = await createSite({}, form({ url: 'ejemplo.com' }))
    expect(result).toEqual({ error: 'No se pudo guardar el sitio. Inténtalo de nuevo.', values: { url: 'ejemplo.com' } })
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

  it('si algo lanza devuelve un error genérico en vez de romper la página (D-UX-12)', async () => {
    const boom = new Error('fetch failed')
    getUser.mockRejectedValue(boom)
    const result = await deleteSite({}, form({ id: SITE_ID }))
    expect(result).toEqual({ error: 'No se pudo borrar el sitio. Inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalledWith('[deleteSite]', boom)
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
