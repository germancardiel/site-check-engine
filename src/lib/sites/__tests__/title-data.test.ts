import { beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { data: unknown; error: unknown }

const db = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  results: {} as Record<string, Result>,
  filters: [] as Array<[string, string, unknown]>,
  throws: false,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    if (db.throws) throw new Error('sin entorno')
    return {
      auth: { getUser: async () => ({ data: { user: db.user } }) },
      from: (table: string) => {
        const chain = {
          select: () => chain,
          eq: (column: string, value: unknown) => {
            db.filters.push([table, column, value])
            return chain
          },
          maybeSingle: async () => db.results[table] ?? { data: null, error: null },
        }
        return chain
      },
    }
  },
}))

import { formatAbsoluteDate } from '@/lib/format'
import { auditPageTitle, sitePageTitle } from '@/lib/page-titles'
import { loadAuditTitleData, loadSiteName } from '../title-data'

const SITE_ID = '11111111-1111-4111-8111-111111111111'
const AUDIT_ID = '22222222-2222-4222-8222-222222222222'
const CREATED_AT = '2026-11-25T10:30:00.000Z'

beforeEach(() => {
  db.user = { id: 'u1' }
  db.results = {}
  db.filters = []
  db.throws = false
  vi.restoreAllMocks()
})

describe('loadSiteName (T21 CA7: título del detalle de sitio)', () => {
  it('devuelve el nombre del sitio del usuario y el título lo incluye', async () => {
    db.results.sites = { data: { url: 'https://tienda.test/', name: 'Mi tienda' }, error: null }
    const name = await loadSiteName(SITE_ID)
    expect(name).toBe('Mi tienda')
    expect(sitePageTitle(name)).toContain('Mi tienda')
    expect(db.filters).toContainEqual(['sites', 'user_id', 'u1'])
  })

  it('devuelve null con un id inválido, sin sesión, si no existe o si falla', async () => {
    expect(await loadSiteName('no-uuid')).toBeNull()
    db.user = null
    expect(await loadSiteName(SITE_ID)).toBeNull()
    db.user = { id: 'u1' }
    expect(await loadSiteName(SITE_ID)).toBeNull()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    db.results.sites = { data: null, error: { message: 'rls' } }
    expect(await loadSiteName(SITE_ID)).toBeNull()
    db.throws = true
    expect(await loadSiteName(SITE_ID)).toBeNull()
    expect(console.error).toHaveBeenCalledTimes(2)
  })
})

describe('loadAuditTitleData (T21 CA7: título de la auditoría)', () => {
  it('devuelve el nombre del sitio y la fecha; el título incluye ambos', async () => {
    db.results.sites = { data: { url: 'https://tienda.test/', name: null }, error: null }
    db.results.audits = { data: { created_at: CREATED_AT }, error: null }
    const data = await loadAuditTitleData({ siteId: SITE_ID, auditId: AUDIT_ID })
    expect(data).toEqual({ name: 'tienda.test', createdAt: CREATED_AT })
    const title = auditPageTitle(data.name, data.createdAt)
    expect(title).toContain('tienda.test')
    expect(title).toContain(formatAbsoluteDate(CREATED_AT))
    expect(db.filters).toContainEqual(['audits', 'user_id', 'u1'])
  })

  it('devuelve nulls con parámetros inválidos, sin sesión o si falla', async () => {
    const empty = { name: null, createdAt: null }
    expect(await loadAuditTitleData({ siteId: 'x', auditId: AUDIT_ID })).toEqual(empty)
    db.user = null
    expect(await loadAuditTitleData({ siteId: SITE_ID, auditId: AUDIT_ID })).toEqual(empty)
    db.user = { id: 'u1' }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    db.results.audits = { data: null, error: { message: 'rls' } }
    expect(await loadAuditTitleData({ siteId: SITE_ID, auditId: AUDIT_ID })).toEqual(empty)
    db.throws = true
    expect(await loadAuditTitleData({ siteId: SITE_ID, auditId: AUDIT_ID })).toEqual(empty)
    expect(console.error).toHaveBeenCalledTimes(2)
  })
})
