import { describe, expect, it } from 'vitest'
import { auditRouteParamsSchema, checksSchema, parseChecks, parseCompareParam } from '../audit'

const SITE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const AUDIT_ID = '0b3c4a9e-5d1f-4f7a-9c2b-8e6d1a2b3c4d'
const OTHER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

const validCheck = {
  id: 'onpage.title',
  category: 'onpage',
  title: 'Title con longitud adecuada',
  status: 'pass',
  weight: 3,
  message: 'El título tiene 45 caracteres.',
  evidence: '"Título"',
  items: [{ label: 'title', value: '45', status: 'ok' }],
  fix: '<title>…</title>',
  docs: [{ label: 'Google Search Central', url: 'https://developers.google.com/search' }],
  recommendation: 'Mantén el título entre 30 y 60 caracteres.',
}

const legacyCheck = {
  id: 'title',
  category: 'seo',
  title: 'Etiqueta title',
  status: 'pass',
  weight: 10,
  message: 'El título tiene 45 caracteres.',
  recommendation: 'Mantén el título entre 30 y 60 caracteres.',
}

describe('checksSchema / parseChecks (CA4)', () => {
  it('acepta checks nuevos con las 10 categorías, evidence, items, fix, docs y estados na/error', () => {
    const result = parseChecks([
      validCheck,
      { ...validCheck, id: 'ai.llms', category: 'ai', status: 'warn' },
      { ...validCheck, id: 'perf.lcp', category: 'performance', status: 'error' },
      { ...validCheck, id: 'intl.hreflang', category: 'international', status: 'na' },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.checks).toHaveLength(4)
      expect(result.checks[0].docs).toHaveLength(1)
    }
    expect(parseChecks([])).toEqual({ ok: true, checks: [] })
  })

  it('normaliza filas antiguas guardadas en BD (category: seo -> crawl, docs: []) y deriva recommendation si falta', () => {
    const withoutRec = {
      id: 'crawl.noindex',
      category: 'crawl',
      title: 'Noindex',
      status: 'fail',
      weight: 3,
      message: 'Tiene noindex.',
      fix: 'Quita noindex.',
    }
    const result = parseChecks([legacyCheck, withoutRec])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.checks[0].category).toBe('crawl')
      expect(result.checks[0].docs).toEqual([])
      expect(result.checks[1].recommendation).toBe('Quita noindex.')
    }
  })

  it('rechaza valores que no son un array', () => {
    expect(parseChecks(null).ok).toBe(false)
    expect(parseChecks({ checks: [] }).ok).toBe(false)
    expect(parseChecks('[]').ok).toBe(false)
  })

  it('rechaza checks con estado, categoría o campos inválidos', () => {
    expect(parseChecks([{ ...validCheck, status: 'ok' }]).ok).toBe(false)
    expect(parseChecks([{ ...validCheck, category: 'perf' }]).ok).toBe(false)
    expect(parseChecks([{ ...validCheck, weight: '10' }]).ok).toBe(false)
    expect(parseChecks([{ ...validCheck, weight: -1 }]).ok).toBe(false)
    expect(parseChecks([{ ...validCheck, id: '' }]).ok).toBe(false)
    const missing = Object.fromEntries(Object.entries(validCheck).filter(([key]) => key !== 'message'))
    expect(parseChecks([missing]).ok).toBe(false)
  })

  it('devuelve el error de zod cuando falla', () => {
    const result = parseChecks([{ ...validCheck, status: 'x' }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.issues.length).toBeGreaterThan(0)
  })

  it('descarta propiedades desconocidas', () => {
    const parsed = checksSchema.parse([{ ...validCheck, html: '<script></script>' }])
    expect(parsed[0]).not.toHaveProperty('html')
  })
})

describe('auditRouteParamsSchema', () => {
  it('acepta dos uuid', () => {
    expect(auditRouteParamsSchema.safeParse({ siteId: SITE_ID, auditId: AUDIT_ID }).success).toBe(true)
  })

  it('rechaza ids que no son uuid', () => {
    expect(auditRouteParamsSchema.safeParse({ siteId: 'abc', auditId: AUDIT_ID }).success).toBe(false)
    expect(auditRouteParamsSchema.safeParse({ siteId: SITE_ID, auditId: '1' }).success).toBe(false)
  })
})

describe('parseCompareParam', () => {
  it('devuelve el uuid si es válido y distinto de la auditoría actual', () => {
    expect(parseCompareParam(OTHER_ID, AUDIT_ID)).toBe(OTHER_ID)
  })

  it('ignora valores ausentes, inválidos, repetidos o iguales a la actual', () => {
    expect(parseCompareParam(undefined, AUDIT_ID)).toBeNull()
    expect(parseCompareParam('no-es-uuid', AUDIT_ID)).toBeNull()
    expect(parseCompareParam([OTHER_ID, SITE_ID], AUDIT_ID)).toBeNull()
    expect(parseCompareParam(AUDIT_ID, AUDIT_ID)).toBeNull()
  })
})
