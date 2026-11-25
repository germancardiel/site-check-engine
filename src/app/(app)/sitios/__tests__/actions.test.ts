import { beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { data?: unknown; error: unknown }
type Call = { method: string; args: unknown[] }

const { getUser, signOut, redirect, revalidatePath, runAudit, from, queries } = vi.hoisted(() => {
  const queries: Array<{ table: string; calls: Array<{ method: string; args: unknown[] }> }> = []
  const results: Record<string, Array<{ data?: unknown; error: unknown }>> = {}
  return {
    getUser: vi.fn(),
    signOut: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`)
    }),
    revalidatePath: vi.fn(),
    runAudit: vi.fn(),
    queries,
    from: Object.assign(
      vi.fn((table: string) => {
        const calls: Array<{ method: string; args: unknown[] }> = []
        queries.push({ table, calls })
        const result = () => results[table]?.shift() ?? { data: null, error: null }
        const builder: Record<string, unknown> = {
          then: (resolve: (value: unknown) => unknown) => resolve(result()),
          maybeSingle: () => {
            calls.push({ method: 'maybeSingle', args: [] })
            return Promise.resolve(result())
          },
        }
        for (const method of ['select', 'insert', 'delete', 'eq', 'gte', 'limit']) {
          builder[method] = (...args: unknown[]) => {
            calls.push({ method, args })
            return builder
          }
        }
        return builder
      }),
      { results },
    ),
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser, signOut }, from })),
}))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/lib/audit', () => ({ runAudit }))

import { auditSite, createSite, deleteSite, logout } from '../actions'

const USER = { id: 'user-1' }
const SITE_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

function queueResults(table: string, ...items: Result[]) {
  from.results[table] = items
}

function callsOf(table: string, index = 0): Call[] {
  return queries.filter((q) => q.table === table)[index]?.calls ?? []
}

function signedIn() {
  getUser.mockResolvedValue({ data: { user: USER }, error: null })
}

function signedOut() {
  getUser.mockResolvedValue({ data: { user: null }, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  queries.length = 0
  for (const key of Object.keys(from.results)) delete from.results[key]
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

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

describe('auditSite', () => {
  const site = { id: SITE_ID, url: 'https://ejemplo.com' }
  const checks = [
    {
      id: 'title',
      category: 'seo',
      title: 'Título',
      status: 'pass',
      weight: 1,
      message: 'ok',
      recommendation: '',
    },
  ]

  it('no llama a Supabase ni a runAudit si el siteId no es un uuid', async () => {
    const result = await auditSite({}, form({ siteId: 'no-uuid' }))
    expect(result).toEqual({ error: 'El sitio no es válido.' })
    expect(getUser).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
    expect(runAudit).not.toHaveBeenCalled()
  })

  it('no audita si no hay sesión', async () => {
    signedOut()
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' })
    expect(from).not.toHaveBeenCalled()
    expect(runAudit).not.toHaveBeenCalled()
  })

  it('devuelve un error genérico si el sitio no existe o es de otro usuario', async () => {
    signedIn()
    queueResults('sites', { data: null, error: null })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'No se encontró el sitio.' })
    expect(callsOf('sites')).toEqual([
      { method: 'select', args: ['id, url'] },
      { method: 'eq', args: ['id', SITE_ID] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'maybeSingle', args: [] },
    ])
    expect(runAudit).not.toHaveBeenCalled()
  })

  it('registra el error si falla la lectura del sitio y no audita', async () => {
    signedIn()
    queueResults('sites', { data: null, error: { message: 'boom' } })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'No se encontró el sitio.' })
    expect(console.error).toHaveBeenCalledWith('[auditSite] site', { message: 'boom' })
    expect(runAudit).not.toHaveBeenCalled()
  })

  it('no llama a runAudit si hay una auditoría de hace menos de 60 s', async () => {
    signedIn()
    vi.useFakeTimers({ now: new Date('2026-11-25T12:00:00.000Z') })
    queueResults('sites', { data: site, error: null })
    queueResults('audits', { data: [{ id: 'a1' }], error: null })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    vi.useRealTimers()
    expect(result).toEqual({ error: 'Espera un minuto antes de volver a auditar este sitio.' })
    expect(callsOf('audits')).toContainEqual({
      method: 'gte',
      args: ['created_at', '2026-11-25T11:59:00.000Z'],
    })
    expect(runAudit).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('devuelve un error genérico si falla la comprobación del límite', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    queueResults('audits', { data: null, error: { message: 'boom' } })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'No se pudo iniciar la auditoría. Inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalledWith('[auditSite] cooldown', { message: 'boom' })
    expect(runAudit).not.toHaveBeenCalled()
  })

  it('inserta una auditoría ok con notas y checks y revalida /sitios', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    queueResults('audits', { data: [], error: null }, { error: null })
    runAudit.mockResolvedValue({ status: 'ok', score: 80, seoScore: 90, aiScore: 70, checks })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ message: 'Auditoría completada.' })
    expect(runAudit).toHaveBeenCalledWith('https://ejemplo.com')
    expect(callsOf('audits', 1)).toEqual([
      {
        method: 'insert',
        args: [
          {
            site_id: SITE_ID,
            user_id: 'user-1',
            status: 'ok',
            score: 80,
            seo_score: 90,
            ai_score: 70,
            checks,
            error: null,
          },
        ],
      },
    ])
    expect(revalidatePath).toHaveBeenCalledWith('/sitios')
    expect(revalidatePath).toHaveBeenCalledWith(`/sitios/${SITE_ID}`)
  })

  it('inserta también una auditoría fallida y devuelve su mensaje', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    queueResults('audits', { data: [], error: null }, { error: null })
    runAudit.mockResolvedValue({ status: 'error', error: 'La página tardó demasiado en responder.' })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'La página tardó demasiado en responder.' })
    expect(callsOf('audits', 1)).toEqual([
      {
        method: 'insert',
        args: [
          {
            site_id: SITE_ID,
            user_id: 'user-1',
            status: 'error',
            checks: [],
            error: 'La página tardó demasiado en responder.',
          },
        ],
      },
    ])
    expect(revalidatePath).toHaveBeenCalledWith('/sitios')
    expect(revalidatePath).toHaveBeenCalledWith(`/sitios/${SITE_ID}`)
  })

  it('devuelve un error genérico y lo registra si falla el insert', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    const dbError = { code: '42501', message: 'new row violates row-level security policy' }
    queueResults('audits', { data: [], error: null }, { error: dbError })
    runAudit.mockResolvedValue({ status: 'ok', score: 80, seoScore: 90, aiScore: 70, checks })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'No se pudo guardar la auditoría. Inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalledWith('[auditSite] insert', dbError)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
