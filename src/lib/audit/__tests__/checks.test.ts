import { describe, expect, it, vi } from 'vitest'
import { CATEGORIES } from '../categories'
import { ALL_CHECKS, CHECK_BY_ID, CHECK_CATALOG, runCheckDef, runChecks } from '../checks'
import { accessibleName, itemList, resolveUrl } from '../checks/helpers'
import { parseHtml } from '../parse'
import { buildCategories, scoreAudit } from '../scoring'
import { CASES_PART_1, type CheckCase } from './checks-cases-1'
import { CASES_PART_2 } from './checks-cases-2'
import { CASES_PART_3 } from './checks-cases-3'
import { makeCtx, PERFECT_HTML, resultsFor } from './fixtures/helpers'

const CASES: Record<string, CheckCase[]> = {
  ...CASES_PART_1,
  ...CASES_PART_2,
  ...CASES_PART_3,
}

describe.each(Object.entries(CASES))('check %s', (id, cases) => {
  it('está registrado en ALL_CHECKS y declara bibliografía oficial (CA1)', () => {
    const def = CHECK_BY_ID.get(id)
    expect(def).toBeDefined()
    expect(def!.docs.length).toBeGreaterThan(0)
    expect(def!.weight).toBeGreaterThanOrEqual(1)
  })

  it('tiene al menos un caso pass y uno fail o warn con fixture (D-TEST-03 / CA7)', () => {
    const statuses = cases.map((c) => c.status)
    expect(statuses).toContain('pass')
    expect(statuses.some((s) => s === 'fail' || s === 'warn' || s === 'error')).toBe(true)
  })

  it.each(cases.map((c, i) => [c.status, i, c] as const))('devuelve %s (caso %i)', (status, _i, c) => {
    const def = CHECK_BY_ID.get(id)!
    const result = runCheckDef(def, c.ctx())
    expect(result.id).toBe(id)
    expect(result.status).toBe(status)
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.recommendation.length).toBeGreaterThan(0)
    expect(result.docs.length).toBeGreaterThan(0)
  })
})

describe('catálogo de 10 categorías y ~68 checks (CA1)', () => {
  it('todos los checks del motor tienen sus casos en CASES', () => {
    const allIds = ALL_CHECKS.map((c) => c.id).sort()
    const testedIds = Object.keys(CASES).sort()
    expect(testedIds).toEqual(allIds)
    expect(ALL_CHECKS.length).toBeGreaterThanOrEqual(68)
  })

  it('tiene las 10 categorías con sus pesos oficiales que suman 100', () => {
    expect(CATEGORIES.map((c) => [c.number, c.id, c.weight])).toEqual([
      [1, 'crawl', 15],
      [2, 'url', 8],
      [3, 'onpage', 15],
      [4, 'content', 12],
      [5, 'schema', 8],
      [6, 'performance', 12],
      [7, 'mobile', 8],
      [8, 'trust', 8],
      [9, 'international', 6],
      [10, 'ai', 8],
    ])
    expect(CATEGORIES.reduce((acc, c) => acc + c.weight, 0)).toBe(100)
  })

  it('PERFECT_HTML supera todos los checks al 100%', () => {
    const results = runChecks(makeCtx(PERFECT_HTML))
    const notPassing = results.filter((r) => r.status !== 'pass').map((r) => `${r.id}: ${r.status}`)
    expect(notPassing).toEqual([])
    const scored = scoreAudit(buildCategories(results))
    expect(scored.score).toBe(100)
    expect(scored.seoScore).toBe(100)
    expect(scored.aiScore).toBe(100)
    expect(scored.label).toBe('Excelente')
  })

  it('CHECK_CATALOG expone id, categoría y título en el mismo orden que ALL_CHECKS', () => {
    expect(CHECK_CATALOG).toEqual(ALL_CHECKS.map(({ id, category, title }) => ({ id, category, title })))
  })

  it('si un check lanza una excepción inesperada, runCheckDef devuelve estado error sin abortar la auditoría', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = {
      ...ALL_CHECKS[0],
      id: 'broken.check',
      run: () => {
        throw new Error('boom')
      },
    }
    const res = runCheckDef(broken, makeCtx(PERFECT_HTML))
    expect(res.status).toBe('error')
    expect(res.message).toContain('No se ha podido evaluar')
    vi.restoreAllMocks()
  })

  it('accessibleName e itemList cubren las variantes de accesibilidad y evidencias', () => {
    const $ = parseHtml(
      '<div><span id="lbl">Etiqueta</span><button aria-labelledby="lbl"></button><button><img alt="Icono"/></button><button><svg><title>Svg</title></svg></button><button title="Título"></button><input type="button" value="Enviar"/><a href="/_next/image?url=%2Ffoto.jpg">Link</a></div>',
    )
    const btns = $('button, input')
    expect(accessibleName($, $(btns[0]))).toBe('Etiqueta')
    expect(accessibleName($, $(btns[1]))).toBe('Icono')
    expect(accessibleName($, $(btns[2]))).toBe('Svg')
    expect(accessibleName($, $(btns[3]))).toBe('Título')
    expect(accessibleName($, $(btns[4]))).toBe('Enviar')
    expect(itemList(['a', 'b'], 'ok')).toEqual([
      { label: 'a', status: 'ok' },
      { label: 'b', status: 'ok' },
    ])
    expect(resolveUrl(makeCtx(PERFECT_HTML), 'http://[mal')).toBeNull()
    const r = resultsFor(PERFECT_HTML.replace('/img/plan-semanal-lleida.jpg', '/_next/image?url=%2Fimg%2Ffoto-optimizada.jpg'))
    expect(r['content.img-names'].status).toBe('pass')
  })
})
