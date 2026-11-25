import { describe, expect, it } from 'vitest'
import { diffAudits } from '../diff'
import {
  CHECK_STATUS_LABEL,
  checkAnchorId,
  groupCatalog,
  groupChecks,
  hasCheckChanges,
  prioritizeChecks,
  resolveComparisonTarget,
  sortChecks,
  type ComparisonCandidate,
} from '../present'
import type { CheckCategory, CheckResult, CheckStatus } from '../types'

function check(id: string, category: CheckCategory, status: CheckStatus): CheckResult {
  return { id, category, status, title: `Check ${id}`, weight: 5, message: 'Mensaje', recommendation: 'Recomendación' }
}

const SITE = 'site-1'

function candidate(id: string, day: number, overrides: Partial<ComparisonCandidate> = {}): ComparisonCandidate {
  return { id, site_id: SITE, status: 'ok', created_at: new Date(Date.UTC(2026, 10, day)).toISOString(), ...overrides }
}

describe('sortChecks', () => {
  it('ordena fail → warn → pass y mantiene el orden original dentro de cada estado', () => {
    const sorted = sortChecks([
      check('p1', 'seo', 'pass'),
      check('w1', 'seo', 'warn'),
      check('f1', 'seo', 'fail'),
      check('p2', 'seo', 'pass'),
      check('f2', 'seo', 'fail'),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['f1', 'f2', 'w1', 'p1', 'p2'])
  })

  it('no modifica el array de entrada', () => {
    const input = [check('p', 'seo', 'pass'), check('f', 'seo', 'fail')]
    sortChecks(input)
    expect(input.map((item) => item.id)).toEqual(['p', 'f'])
  })
})

describe('prioritizeChecks', () => {
  it('pone primero los fail y luego los warn de ambas categorías, y aparta los pass', () => {
    const { pending, passed } = prioritizeChecks([
      check('p1', 'seo', 'pass'),
      check('w1', 'ai', 'warn'),
      check('f1', 'seo', 'fail'),
      check('w2', 'seo', 'warn'),
      check('f2', 'ai', 'fail'),
      check('p2', 'ai', 'pass'),
    ])
    expect(pending.map((item) => item.id)).toEqual(['f1', 'f2', 'w1', 'w2'])
    expect(passed.map((item) => item.id)).toEqual(['p1', 'p2'])
  })

  it('devuelve listas vacías sin checks', () => {
    expect(prioritizeChecks([])).toEqual({ pending: [], passed: [] })
  })
})

describe('groupChecks', () => {
  it('agrupa en SEO e IA, separando pendientes (fail, warn) y superados', () => {
    const groups = groupChecks([
      check('ai-pass', 'ai', 'pass'),
      check('seo-warn', 'seo', 'warn'),
      check('ai-fail', 'ai', 'fail'),
      check('seo-pass', 'seo', 'pass'),
      check('seo-fail', 'seo', 'fail'),
      check('ai-warn', 'ai', 'warn'),
    ])
    expect(groups.map((group) => [group.category, group.title])).toEqual([
      ['seo', 'SEO'],
      ['ai', 'Visibilidad en IA'],
    ])
    expect(groups[0].pending.map((item) => item.id)).toEqual(['seo-fail', 'seo-warn'])
    expect(groups[0].passed.map((item) => item.id)).toEqual(['seo-pass'])
    expect(groups[1].pending.map((item) => item.id)).toEqual(['ai-fail', 'ai-warn'])
    expect(groups[1].passed.map((item) => item.id)).toEqual(['ai-pass'])
  })

  it('devuelve las dos secciones vacías sin checks', () => {
    const groups = groupChecks([])
    expect(groups).toHaveLength(2)
    expect(groups.every((group) => group.pending.length === 0 && group.passed.length === 0)).toBe(true)
  })

  it('tiene una etiqueta de texto para cada estado', () => {
    expect(CHECK_STATUS_LABEL).toEqual({ fail: 'Falla', warn: 'Mejorable', pass: 'Correcto' })
  })
})

describe('resolveComparisonTarget', () => {
  const current = candidate('current', 10)
  const previous = candidate('previous', 5)

  it('usa la auditoría ok anterior por defecto', () => {
    expect(resolveComparisonTarget(current, null, previous)).toEqual({ audit: previous, source: 'previous' })
  })

  it('usa la auditoría de ?comparar si es ok y del mismo sitio (aunque sea posterior)', () => {
    const requested = candidate('requested', 12)
    expect(resolveComparisonTarget(current, requested, previous)).toEqual({ audit: requested, source: 'requested' })
  })

  it('ignora ?comparar de otro sitio y usa la anterior', () => {
    const requested = candidate('other-site', 3, { site_id: 'site-2' })
    expect(resolveComparisonTarget(current, requested, previous)).toEqual({ audit: previous, source: 'previous' })
  })

  it('ignora ?comparar si es una auditoría error o la propia auditoría', () => {
    expect(resolveComparisonTarget(current, candidate('failed', 3, { status: 'error' }), previous)?.source).toBe(
      'previous',
    )
    expect(resolveComparisonTarget(current, current, previous)?.audit.id).toBe('previous')
  })

  it('devuelve null si no hay anterior válida', () => {
    expect(resolveComparisonTarget(current, null, null)).toBeNull()
    expect(resolveComparisonTarget(current, null, candidate('newer', 11))).toBeNull()
    expect(resolveComparisonTarget(current, null, candidate('x', 1, { site_id: 'site-2' }))).toBeNull()
  })
})

describe('hasCheckChanges', () => {
  const snapshot = (checks: CheckResult[]) => ({ score: 50, seoScore: 50, aiScore: 50, checks })

  it('es false si todos los checks siguen igual', () => {
    const checks = [check('a', 'seo', 'pass')]
    expect(hasCheckChanges(diffAudits(snapshot(checks), snapshot(checks)))).toBe(false)
  })

  it('es true si hay mejoras, empeoramientos, nuevos o eliminados', () => {
    const before = [check('a', 'seo', 'fail')]
    expect(hasCheckChanges(diffAudits(snapshot(before), snapshot([check('a', 'seo', 'pass')])))).toBe(true)
    expect(hasCheckChanges(diffAudits(snapshot([check('a', 'seo', 'pass')]), snapshot(before)))).toBe(true)
    expect(hasCheckChanges(diffAudits(snapshot([]), snapshot(before)))).toBe(true)
    expect(hasCheckChanges(diffAudits(snapshot(before), snapshot([])))).toBe(true)
  })
})

describe('checkAnchorId', () => {
  it('genera un id de ancla estable y seguro para el fragmento', () => {
    expect(checkAnchorId('meta-description')).toBe('check-meta-description')
    expect(checkAnchorId('og:title x')).toBe('check-og-title-x')
  })
})

describe('groupCatalog', () => {
  it('separa el catálogo en SEO e IA conservando el orden', () => {
    const catalog = [
      { id: 'a', category: 'ai' as const, title: 'A' },
      { id: 'b', category: 'seo' as const, title: 'B' },
      { id: 'c', category: 'ai' as const, title: 'C' },
    ]
    expect(groupCatalog(catalog)).toEqual([
      { category: 'seo', title: 'SEO', checks: [catalog[1]] },
      { category: 'ai', title: 'Visibilidad en IA', checks: [catalog[0], catalog[2]] },
    ])
  })
})
