import { describe, expect, it } from 'vitest'
import { diffAudits, type AuditSnapshot } from '../diff'
import type { CheckStatus } from '../types'

const c = (id: string, status: CheckStatus) => ({ id, status, category: 'seo' as const, title: `Check ${id}` })

const snapshot = (checks: ReturnType<typeof c>[], score: number | null = 50): AuditSnapshot => ({
  score,
  seoScore: score === null ? null : score + 10,
  aiScore: score === null ? null : score - 10,
  checks,
})

describe('diffAudits', () => {
  it('clasifica mejoras, empeoramientos, sin cambios, nuevos y eliminados por id', () => {
    const prev = snapshot([c('a', 'fail'), c('b', 'warn'), c('c', 'pass'), c('d', 'pass'), c('old', 'fail')], 40)
    const curr = snapshot([c('a', 'warn'), c('b', 'pass'), c('c', 'fail'), c('d', 'pass'), c('new', 'pass')], 55)
    const diff = diffAudits(prev, curr)
    expect(diff.scoreDelta).toBe(15)
    expect(diff.seoDelta).toBe(15)
    expect(diff.aiDelta).toBe(15)
    expect(diff.improved.map((x) => [x.id, x.from, x.to])).toEqual([
      ['a', 'fail', 'warn'],
      ['b', 'warn', 'pass'],
    ])
    expect(diff.regressed.map((x) => [x.id, x.from, x.to])).toEqual([['c', 'pass', 'fail']])
    expect(diff.unchanged.map((x) => x.id)).toEqual(['d'])
    expect(diff.added).toEqual([{ id: 'new', category: 'seo', title: 'Check new', from: null, to: 'pass' }])
    expect(diff.removed).toEqual([{ id: 'old', category: 'seo', title: 'Check old', from: 'fail', to: null }])
  })

  it('ordena los estados fail < warn < pass', () => {
    const diff = diffAudits(snapshot([c('x', 'pass'), c('y', 'warn')]), snapshot([c('x', 'warn'), c('y', 'fail')]))
    expect(diff.regressed.map((x) => x.id)).toEqual(['x', 'y'])
    expect(diff.improved).toEqual([])
  })

  it('deltas negativos y nulos si alguna auditoría no tiene nota', () => {
    expect(diffAudits(snapshot([], 80), snapshot([], 60)).scoreDelta).toBe(-20)
    const diff = diffAudits(snapshot([], null), snapshot([], 60))
    expect(diff).toMatchObject({ scoreDelta: null, seoDelta: null, aiDelta: null })
  })

  it('dos auditorías idénticas no tienen cambios', () => {
    const audit = snapshot([c('a', 'pass'), c('b', 'fail')])
    const diff = diffAudits(audit, audit)
    expect(diff.scoreDelta).toBe(0)
    expect(diff.unchanged).toHaveLength(2)
    expect([...diff.improved, ...diff.regressed, ...diff.added, ...diff.removed]).toEqual([])
  })
})
