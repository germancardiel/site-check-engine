import { describe, expect, it } from 'vitest'
import { diffAudits } from '../diff'
import {
  buildAuditReport,
  CHECK_STATUS_LABEL,
  checkAnchorId,
  groupCatalog,
  groupChecks,
  issuesCountLabel,
  NO_SCORE_LABEL,
  hasCheckChanges,
  prioritizeChecks,
  reportToMarkdown,
  resolveComparisonTarget,
  sortChecks,
  STATUS_LABEL,
  type ComparisonCandidate,
} from '../present'
import type { CategoryId, CheckResult, CheckStatus } from '../types'

function check(
  id: string,
  category: CategoryId,
  status: CheckStatus,
  overrides: Partial<CheckResult> = {},
): CheckResult {
  return {
    id,
    category,
    status,
    title: `Check ${id}`,
    weight: 2,
    message: 'Mensaje de prueba',
    recommendation: 'Recomendación',
    docs: [{ label: 'Doc oficial', url: 'https://example.com/doc' }],
    ...overrides,
  }
}

const SITE = 'site-1'

function candidate(id: string, day: number, overrides: Partial<ComparisonCandidate> = {}): ComparisonCandidate {
  return { id, site_id: SITE, status: 'ok', created_at: new Date(Date.UTC(2026, 10, day)).toISOString(), ...overrides }
}

describe('sortChecks', () => {
  it('ordena fail → warn → pass → error → na y mantiene el orden original dentro de cada estado', () => {
    const sorted = sortChecks([
      check('n1', 'crawl', 'na'),
      check('e1', 'crawl', 'error'),
      check('p1', 'crawl', 'pass'),
      check('w1', 'crawl', 'warn'),
      check('f1', 'crawl', 'fail'),
      check('p2', 'crawl', 'pass'),
      check('f2', 'crawl', 'fail'),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['f1', 'f2', 'w1', 'p1', 'p2', 'e1', 'n1'])
  })

  it('no modifica el array de entrada', () => {
    const input = [check('p', 'crawl', 'pass'), check('f', 'crawl', 'fail')]
    sortChecks(input)
    expect(input.map((item) => item.id)).toEqual(['p', 'f'])
  })
})

describe('prioritizeChecks y groupChecks', () => {
  it('separa los pendientes (fail y warn) del resto (pass, na, error)', () => {
    const { pending, passed } = prioritizeChecks([
      check('p1', 'crawl', 'pass'),
      check('w1', 'ai', 'warn'),
      check('f1', 'crawl', 'fail'),
      check('n1', 'url', 'na'),
      check('e1', 'performance', 'error'),
    ])
    expect(pending.map((item) => item.id)).toEqual(['f1', 'w1'])
    expect(passed.map((item) => item.id)).toEqual(['p1', 'e1', 'n1'])
  })

  it('agrupa por las 10 categorías', () => {
    const groups = groupChecks([
      check('c1', 'crawl', 'fail'),
      check('a1', 'ai', 'pass'),
    ])
    expect(groups).toHaveLength(10)
    expect(groups[0].pending.map((c) => c.id)).toEqual(['c1'])
    expect(groups[9].passed.map((c) => c.id)).toEqual(['a1'])
  })

  it('tiene etiquetas para los 5 estados (T21 CA5: un check fail muestra "Falla", no "Error")', () => {
    expect(CHECK_STATUS_LABEL).toEqual(STATUS_LABEL)
    expect(STATUS_LABEL.fail).toBe('Falla')
    expect(Object.values(STATUS_LABEL)).not.toContain('Error')
    expect(STATUS_LABEL).toEqual({
      pass: 'Correcto',
      warn: 'Mejorable',
      fail: 'Falla',
      na: 'No aplica',
      error: 'No evaluable',
    })
  })
})

describe('buildAuditReport y reportToMarkdown (CA5)', () => {
  it('construye un AuditReport con las 10 categorías y lo exporta a Markdown con evidencias, items, fix y docs', () => {
    const report = buildAuditReport({
      url: 'https://example.com/',
      createdAt: '2026-11-25T10:30:00.000Z',
      checks: [
        check('crawl.noindex', 'crawl', 'fail', {
          title: 'Meta robots noindex',
          evidence: "meta robots='noindex'",
          items: [{ label: 'robots', value: 'noindex', status: 'bad' }],
          fix: 'Quita noindex.',
        }),
        check('onpage.title', 'onpage', 'pass', { title: 'Title adecuado' }),
      ],
      notices: ['Aviso de prueba'],
    })
    expect(report.score).toBe(40)
    expect(report.capReason).toContain('noindex')
    const md = reportToMarkdown(report)
    expect(md).toContain('# Auditoría SEO: https://example.com/')
    expect(md).toContain('**Puntuación global: 40/100')
    expect(md).toContain('Puntuación limitada a 40')
    expect(md).toContain('| Apartado | Puntuación | Aspectos a mejorar |')
    expect(md).toContain(`| ${NO_SCORE_LABEL} | 0 |`)
    expect(md).not.toContain('N/A')
    expect(md).toContain('Meta robots noindex: Falla')
    expect(md).toContain('Aviso de prueba')
    expect(md).toContain('## Resumen por apartado')
    expect(md).toContain('## Aspectos a mejorar (1)')
    expect(md).toContain("`meta robots='noindex'`")
    expect(md).toContain('- robots: noindex')
    expect(md).toContain('**Cómo arreglarlo:**')
    expect(md).toContain('Quita noindex.')
    expect(md).toContain('[Doc oficial](https://example.com/doc)')
  })
})

describe('resolveComparisonTarget, hasCheckChanges, checkAnchorId y groupCatalog', () => {
  const current = candidate('current', 10)
  const previous = candidate('previous', 5)

  it('resuelve la auditoría de comparación por ?comparar o la anterior', () => {
    expect(resolveComparisonTarget(current, null, previous)).toEqual({ audit: previous, source: 'previous' })
    const requested = candidate('requested', 12)
    expect(resolveComparisonTarget(current, requested, previous)).toEqual({ audit: requested, source: 'requested' })
    expect(resolveComparisonTarget(current, candidate('x', 3, { site_id: 'site-2' }), previous)?.source).toBe('previous')
    expect(resolveComparisonTarget(current, null, null)).toBeNull()
  })

  it('detecta si hay cambios entre dos snapshots', () => {
    const snapshot = (checks: CheckResult[]) => ({ score: 50, seoScore: 50, aiScore: 50, checks })
    const a = [check('a', 'crawl', 'fail')]
    const b = [check('a', 'crawl', 'pass')]
    expect(hasCheckChanges(diffAudits(snapshot(a), snapshot(a)))).toBe(false)
    expect(hasCheckChanges(diffAudits(snapshot(a), snapshot(b)))).toBe(true)
  })

  it('genera ids de ancla seguros y agrupa el catálogo por categorías no vacías', () => {
    expect(checkAnchorId('crawl.status')).toBe('check-crawl-status')
    const grouped = groupCatalog([
      { id: 'ai.llms', category: 'ai', title: 'Archivo llms.txt' },
      { id: 'crawl.status', category: 'crawl', title: '200 directo' },
    ])
    expect(grouped.map((g) => [g.number, g.category, g.checks.length])).toEqual([
      [1, 'crawl', 1],
      [10, 'ai', 1],
    ])
  })
})

describe('issuesCountLabel y NO_SCORE_LABEL (T21)', () => {
  it('da un texto accesible con "aspectos a mejorar" en singular y plural', () => {
    expect(issuesCountLabel(1)).toBe('1 aspecto a mejorar')
    expect(issuesCountLabel(3)).toBe('3 aspectos a mejorar')
    expect(issuesCountLabel(0)).toBe('Sin aspectos a mejorar')
  })

  it('una categoría sin nota se muestra como "Sin datos"', () => {
    expect(NO_SCORE_LABEL).toBe('Sin datos')
  })
})
