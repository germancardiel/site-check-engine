import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SITE_ID,
  callsOf,
  form,
  from,
  getUser,
  queueResults,
  revalidatePath,
  rpc,
  runAudit,
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

import { auditSite } from '../actions'

beforeEach(resetHarness)

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

  it('reclama el turno con rpc claim_audit_slot y no llama a runAudit si devuelve false', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    rpc.mockResolvedValue({ data: false, error: null })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'Espera un minuto antes de volver a auditar este sitio.' })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('claim_audit_slot', { p_site_id: SITE_ID })
    expect(from).not.toHaveBeenCalledWith('audits')
    expect(runAudit).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('trata una respuesta null del rpc como límite alcanzado', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    rpc.mockResolvedValue({ data: null, error: null })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'Espera un minuto antes de volver a auditar este sitio.' })
    expect(runAudit).not.toHaveBeenCalled()
  })

  it('devuelve un error genérico si falla el rpc del límite', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'No se pudo iniciar la auditoría. Inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalledWith('[auditSite] cooldown', { message: 'boom' })
    expect(runAudit).not.toHaveBeenCalled()
  })

  it('no reclama el turno si el sitio no existe', async () => {
    signedIn()
    queueResults('sites', { data: null, error: null })
    await auditSite({}, form({ siteId: SITE_ID }))
    expect(rpc).not.toHaveBeenCalled()
  })

  it('inserta una auditoría ok con notas y checks y revalida /sitios', async () => {
    signedIn()
    queueResults('sites', { data: site, error: null })
    rpc.mockResolvedValue({ data: true, error: null })
    queueResults('audits', { error: null })
    runAudit.mockResolvedValue({ status: 'ok', score: 80, seoScore: 90, aiScore: 70, checks })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ message: 'Auditoría completada.' })
    expect(runAudit).toHaveBeenCalledWith('https://ejemplo.com')
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(runAudit.mock.invocationCallOrder[0])
    expect(callsOf('audits')).toEqual([
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
    rpc.mockResolvedValue({ data: true, error: null })
    queueResults('audits', { error: null })
    runAudit.mockResolvedValue({ status: 'error', error: 'La página tardó demasiado en responder.' })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'La página tardó demasiado en responder.' })
    expect(callsOf('audits')).toEqual([
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
    rpc.mockResolvedValue({ data: true, error: null })
    const dbError = { code: '42501', message: 'new row violates row-level security policy' }
    queueResults('audits', { error: dbError })
    runAudit.mockResolvedValue({ status: 'ok', score: 80, seoScore: 90, aiScore: 70, checks })
    const result = await auditSite({}, form({ siteId: SITE_ID }))
    expect(result).toEqual({ error: 'No se pudo guardar la auditoría. Inténtalo de nuevo.' })
    expect(console.error).toHaveBeenCalledWith('[auditSite] insert', dbError)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
