import { describe, expect, it } from 'vitest'
import { categoryScore, scoreChecks } from '../scoring'
import type { CheckCategory, CheckStatus } from '../types'

const check = (category: CheckCategory, status: CheckStatus, weight = 1) => ({ category, status, weight })

describe('scoreChecks', () => {
  it('todo pass da 100 en todas las notas', () => {
    expect(scoreChecks([check('seo', 'pass', 3), check('ai', 'pass', 2)])).toEqual({ score: 100, seoScore: 100, aiScore: 100 })
  })

  it('todo fail da 0 en todas las notas', () => {
    expect(scoreChecks([check('seo', 'fail', 3), check('ai', 'fail', 2)])).toEqual({ score: 0, seoScore: 0, aiScore: 0 })
  })

  it('mezcla: media ponderada con warn = 0,5', () => {
    // SEO: (3·1 + 1·0,5 + 2·0) / 6 = 58,33 → 58 · IA: (1·1 + 1·0) / 2 = 50
    const result = scoreChecks([
      check('seo', 'pass', 3),
      check('seo', 'warn', 1),
      check('seo', 'fail', 2),
      check('ai', 'pass'),
      check('ai', 'fail'),
    ])
    expect(result).toEqual({ seoScore: 58, aiScore: 50, score: 54 })
  })

  it('redondea cada categoría y la nota global', () => {
    // SEO: 2/3 = 66,67 → 67 · IA: 1/2·… warn = 0,5 → 50 · global (67 + 50) / 2 = 58,5 → 59
    const result = scoreChecks([
      check('seo', 'pass'),
      check('seo', 'pass'),
      check('seo', 'fail'),
      check('ai', 'warn'),
    ])
    expect(result).toEqual({ seoScore: 67, aiScore: 50, score: 59 })
  })

  it('una categoría sin checks cuenta como 0', () => {
    expect(scoreChecks([check('seo', 'pass')])).toEqual({ score: 50, seoScore: 100, aiScore: 0 })
    expect(scoreChecks([])).toEqual({ score: 0, seoScore: 0, aiScore: 0 })
  })

  it('devuelve enteros entre 0 y 100', () => {
    const { score, seoScore, aiScore } = scoreChecks([check('seo', 'warn', 7), check('ai', 'pass', 3), check('ai', 'warn', 11)])
    for (const value of [score, seoScore, aiScore]) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  it('ignora checks con peso 0', () => {
    expect(categoryScore([check('seo', 'fail', 0), check('seo', 'pass')], 'seo')).toBe(100)
  })
})
