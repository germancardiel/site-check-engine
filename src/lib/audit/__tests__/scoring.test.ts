import { describe, expect, it } from 'vitest'
import {
  BLOCKING_CAP,
  buildCategories,
  isEvaluable,
  isIssue,
  labelFor,
  scoreAudit,
  scoreCheckList,
  scoreChecks,
} from '../scoring'
import type { CategoryId, CheckResult, CheckStatus } from '../types'

const check = (
  category: CategoryId,
  status: CheckStatus,
  weight = 1,
  id = `${category}-${status}`,
): CheckResult => ({
  id,
  category,
  title: id,
  status,
  weight,
  message: '',
  recommendation: '',
  docs: [],
})

describe('scoreCheckList y scoreChecks (CA3)', () => {
  it('pass = 1, warn = 0.5, fail = 0; na y error no penalizan', () => {
    expect(scoreCheckList([check('crawl', 'pass', 3), check('crawl', 'fail', 1)])).toBe(75)
    expect(scoreCheckList([check('crawl', 'warn'), check('crawl', 'pass')])).toBe(75)
    expect(scoreCheckList([check('crawl', 'pass'), check('crawl', 'na'), check('crawl', 'error')])).toBe(100)
    expect(scoreCheckList([check('crawl', 'na'), check('crawl', 'error')])).toBeNull()
    expect(isEvaluable('pass')).toBe(true)
    expect(isEvaluable('na')).toBe(false)
    expect(isIssue('warn')).toBe(true)
    expect(isIssue('pass')).toBe(false)
  })

  it('todo pass da 100 en score, seoScore y aiScore', () => {
    const result = scoreChecks([check('crawl', 'pass', 3), check('ai', 'pass', 2)])
    expect(result).toEqual({
      score: 100,
      seoScore: 100,
      aiScore: 100,
      label: 'Excelente',
    })
  })

  it('todo fail da 0 en todas las notas', () => {
    const result = scoreChecks([check('crawl', 'fail', 3), check('ai', 'fail', 2)])
    expect(result).toEqual({
      score: 0,
      seoScore: 0,
      aiScore: 0,
      label: 'Deficiente',
    })
  })

  it('aplica BLOCKING_CAP = 40 y devuelve capReason si falla crawl.status, crawl.robots-txt o crawl.noindex', () => {
    const cats = buildCategories([
      check('crawl', 'fail', 3, 'crawl.noindex'),
      check('onpage', 'pass', 3, 'onpage.title'),
      check('ai', 'pass', 3, 'ai.ssr'),
    ])
    const scored = scoreAudit(cats)
    expect(scored.score).toBe(BLOCKING_CAP)
    expect(scored.capReason).toBe('La página tiene la directiva noindex')
  })

  it('devuelve las etiquetas Excelente (≥90), Bueno (≥75), Mejorable (≥50) y Deficiente (<50)', () => {
    expect(labelFor(95)).toBe('Excelente')
    expect(labelFor(80)).toBe('Bueno')
    expect(labelFor(55)).toBe('Mejorable')
    expect(labelFor(30)).toBe('Deficiente')
  })

  it('ordena los issues con fail primero y luego por impacto (check.weight × category.weight)', () => {
    const cats = buildCategories([
      check('crawl', 'warn', 3, 'crawl.a'),
      check('international', 'fail', 1, 'intl.b'),
      check('crawl', 'fail', 3, 'crawl.c'),
    ])
    const { issues } = scoreAudit(cats)
    expect(issues.map((i) => i.checkId)).toEqual(['crawl.c', 'intl.b', 'crawl.a'])
  })

  it('ignora checks con peso 0 y devuelve null en listas sin checks evaluables', () => {
    expect(scoreCheckList([check('crawl', 'fail', 0), check('crawl', 'pass', 1)])).toBe(100)
    expect(scoreCheckList([])).toBeNull()
    expect(scoreChecks([])).toEqual({ score: 0, seoScore: 0, aiScore: 0, label: 'Deficiente' })
  })
})
