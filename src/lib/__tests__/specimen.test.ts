import { describe, expect, it } from 'vitest'
import { ALL_CHECKS, CHECK_CATALOG } from '@/lib/audit/checks'
import { scoreChecks } from '@/lib/audit/scoring'
import { buildSpecimen, SPECIMEN_STATUS } from '@/lib/specimen'

describe('buildSpecimen', () => {
  it('incluye todos los checks del catálogo, en su orden', () => {
    const { rows } = buildSpecimen()
    expect(rows.map((row) => row.id)).toEqual(CHECK_CATALOG.map((check) => check.id))
  })

  it('aplica los estados de ejemplo y deja el resto en pass', () => {
    const { rows } = buildSpecimen()
    for (const row of rows) expect(row.status).toBe(SPECIMEN_STATUS[row.id] ?? 'pass')
    expect(rows.some((row) => row.status === 'fail')).toBe(true)
    expect(rows.some((row) => row.status === 'warn')).toBe(true)
  })

  it('los estados de ejemplo apuntan a checks que existen', () => {
    const ids = new Set(CHECK_CATALOG.map((check) => check.id))
    for (const id of Object.keys(SPECIMEN_STATUS)) expect(ids.has(id), id).toBe(true)
  })

  it('las notas salen del motor de puntuación real con los pesos reales', () => {
    const specimen = buildSpecimen()
    const expected = scoreChecks(
      ALL_CHECKS.map((def) => ({
        id: def.id,
        category: def.category,
        title: def.title,
        weight: def.weight,
        status: SPECIMEN_STATUS[def.id] ?? 'pass',
      })),
    )
    expect({
      score: specimen.score,
      seoScore: specimen.seoScore,
      aiScore: specimen.aiScore,
      label: specimen.label,
    }).toEqual(expected)
    expect(specimen.seoScore).toBeLessThan(100)
    expect(specimen.aiScore).toBeLessThan(100)
  })

  it('es determinista', () => {
    expect(buildSpecimen()).toEqual(buildSpecimen())
  })

  it('usa el catálogo y los estados recibidos (peso 1 si el check no existe)', () => {
    const specimen = buildSpecimen([{ id: 'x', category: 'ai', title: 'Inventado' }], { x: 'fail' })
    expect(specimen.rows).toEqual([{ id: 'x', category: 'ai', title: 'Inventado', status: 'fail' }])
    expect(specimen.aiScore).toBe(0)
    expect(specimen.seoScore).toBe(0)
  })
})
