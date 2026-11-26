import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { makeCheck, validPlan } from '@/lib/ai/__tests__/fixtures'
import { buildAuditReport, NO_SCORE_LABEL } from '@/lib/audit/present'
import { parseHtml } from '@/lib/audit/parse'
import type { AuditDiff } from '@/lib/audit/diff'
import type { CheckResult } from '@/lib/audit/types'

// The real form imports the server actions (Supabase, AI Gateway); it is not under test here.
vi.mock('@/components/ai/generate-report-form', () => ({ GenerateReportForm: () => null }))

import { PlanSection } from '@/components/ai/plan-section'
import { CheckCatalog } from '@/components/landing/check-catalog'
import { SampleReport } from '@/components/landing/sample-report'
import { AuditComparison } from '../audit-comparison'
import { CategoryAccordion } from '../category-accordion'
import { CheckRow } from '../check-row'
import { ComparisonSection } from '../comparison-section'
import { REPORT_SECTION_IDS } from '../report-anchors'
import { ReportIndex, reportIndexLinks } from '../report-index'
import { ReportView } from '../report-view'

const checks: CheckResult[] = [
  makeCheck('crawl.noindex', 'fail', {
    category: 'crawl',
    title: 'Meta robots noindex',
    items: [
      { label: 'robots', value: 'noindex', status: 'bad' },
      { label: 'X-Robots-Tag', value: 'ninguna', status: 'ok' },
      { label: 'Canonical', value: '/', status: 'neutral' },
    ],
    docs: [{ label: 'Google Search Central', url: 'https://developers.google.com/search' }],
  }),
  makeCheck('onpage.title', 'warn', { category: 'onpage', title: 'Title con longitud adecuada' }),
  makeCheck('onpage.h1', 'warn', { category: 'onpage', title: 'Un único h1' }),
  makeCheck('ai.llms', 'pass', { category: 'ai', title: 'Archivo llms.txt' }),
]

const report = buildAuditReport({ url: 'https://ejemplo.com/', createdAt: '2026-11-25T10:30:00.000Z', checks })
const emptyDiff: AuditDiff = {
  scoreDelta: 0,
  seoDelta: 0,
  aiDelta: 0,
  improved: [],
  regressed: [],
  unchanged: [],
  added: [],
  removed: [],
}

function renderDetail() {
  return parseHtml(
    renderToStaticMarkup(
      <>
        <ReportIndex hasIssues={report.issues.length > 0} />
        <ReportView report={report} />
        <PlanSection
          siteId="s"
          auditId="a"
          report={{ status: 'ok', data: validPlan, createdAt: '2026-11-25T10:30:00.000Z' }}
          checks={checks}
          siteUrl="https://ejemplo.com/"
          score={report.score}
          remaining={5}
          loadError={false}
        />
        <ComparisonSection comparison={{ kind: 'none' }} options={[]} action="/x" aiSummary={null} />
      </>,
    ),
  )
}

describe('saltos a secciones: destinos enfocables (T21 CA1)', () => {
  it('apartados, checks y secciones del informe tienen tabindex="-1" para recibir el foco', () => {
    const $ = renderDetail()
    expect($('section[id^="cat-"]').length).toBe(10)
    $('section[id^="cat-"]').each((_, el) => void expect($(el).attr('tabindex')).toBe('-1'))
    expect($('#check-crawl-noindex').attr('tabindex')).toBe('-1')
    for (const id of Object.values(REPORT_SECTION_IDS)) expect($(`#${id}`).attr('tabindex'), id).toBe('-1')
  })

  it('el informe salta con jumpToAnchor (foco + reduced-motion), sin scrollIntoView smooth fijo', () => {
    const source = readFileSync(new URL('../report-view.tsx', import.meta.url), 'utf8')
    expect(source).toContain('jumpToAnchor(window, targetElementId)')
    expect(source).not.toContain("behavior: 'smooth'")
  })
})

describe('rejilla de apartados (T21 CA2)', () => {
  it('el contador tiene un nombre accesible con "aspectos a mejorar" y el número visible se oculta a lectores', () => {
    const $ = renderDetail()
    const index = report.categories.findIndex((c) => c.id === 'onpage')
    const onpage = $('ul[aria-label="Apartados de la auditoría"] button').eq(index)
    expect(onpage.find('.sr-only').text()).toBe('2 aspectos a mejorar')
    expect(onpage.find('[aria-hidden="true"]').filter((_, el) => $(el).text() === '2')).toHaveLength(1)
    expect(onpage.text()).toContain('aspectos a mejorar')
  })

  it('un apartado sin datos muestra "Sin datos", nunca "N/A"', () => {
    const $ = renderDetail()
    expect($('ul[aria-label="Apartados de la auditoría"]').text()).toContain(NO_SCORE_LABEL)
    expect($.text()).not.toContain('N/A')
  })
})

describe('evidencias ok/bad (T21 CA3)', () => {
  it('cada evidencia ok/bad tiene icono y texto sr-only; las neutras no', () => {
    const $ = parseHtml(renderToStaticMarkup(<CheckRow check={checks[0]} />))
    const items = $('ul li')
    expect(items).toHaveLength(3)
    expect(items.eq(0).find('svg[aria-hidden="true"]')).toHaveLength(1)
    expect(items.eq(0).find('.sr-only').text()).toBe('Falla: ')
    expect(items.eq(1).find('svg[aria-hidden="true"]')).toHaveLength(1)
    expect(items.eq(1).find('.sr-only').text()).toBe('Correcto: ')
    expect(items.eq(2).find('svg')).toHaveLength(0)
    expect(items.eq(2).find('.sr-only')).toHaveLength(0)
  })
})

describe('textos (T21 CA4)', () => {
  it('ningún texto visible usa "check(s)" ni "N/A"', () => {
    const texts = [
      renderDetail().text(),
      parseHtml(renderToStaticMarkup(<CheckCatalog />)).text(),
      parseHtml(renderToStaticMarkup(<SampleReport />)).text(),
      parseHtml(renderToStaticMarkup(<AuditComparison since="2026-11-24T10:00:00.000Z" diff={emptyDiff} />)).text(),
    ]
    for (const text of texts) {
      expect(text).not.toMatch(/\bchecks?\b/i)
      expect(text).not.toContain('N/A')
    }
  })

  it('los dos botones de descarga tienen textos distintos', () => {
    const $ = renderDetail()
    const downloads = $('button')
      .map((_, el) => $(el).text())
      .get()
      .filter((text) => text.startsWith('Descargar'))
    expect(downloads).toEqual(['Descargar informe (Markdown)', 'Descargar plan (Markdown)'])
  })

  it('la puntuación usa una sola palabra y la nota IA tiene una ayuda breve', () => {
    const $ = renderDetail()
    expect($.text()).toContain('visibilidad para asistentes de IA')
    expect($.text()).not.toMatch(/\bnota\b/i)
  })
})

describe('acordeón (T21 CA9)', () => {
  it('cerrado, el panel de aria-controls existe y tiene hidden; abierto, no', () => {
    const category = report.categories.find((c) => c.id === 'crawl')!
    const closed = parseHtml(renderToStaticMarkup(<CategoryAccordion category={category} open={false} onToggle={() => {}} />))
    const controls = closed('button[aria-controls]').attr('aria-controls')!
    expect(closed('button').attr('aria-expanded')).toBe('false')
    expect(closed(`#${controls}`)).toHaveLength(1)
    expect(closed(`#${controls}`).attr('hidden')).toBeDefined()
    const open = parseHtml(renderToStaticMarkup(<CategoryAccordion category={category} open onToggle={() => {}} />))
    expect(open(`#${controls}`).attr('hidden')).toBeUndefined()
  })
})

describe('objetivos táctiles (T21 CA10)', () => {
  it('"Expandir/Colapsar todo" y los enlaces de documentación tienen min-h-10', () => {
    const $ = renderDetail()
    for (const label of ['Expandir todo', 'Colapsar todo']) {
      const button = $('button').filter((_, el) => $(el).text() === label)
      expect(button.attr('class'), label).toContain('min-h-10')
    }
    const row = parseHtml(renderToStaticMarkup(<CheckRow check={checks[0]} />))
    expect(row('a[target="_blank"]').attr('class')).toContain('min-h-10')
  })
})

describe('índice del informe (T21 CA12)', () => {
  it('enlaza Resumen · Aspectos · Plan de acción · Comparación con anclas a secciones existentes', () => {
    const $ = renderDetail()
    const links = $('nav[aria-label="Índice del informe"] a')
    expect(links.map((_, el) => $(el).text()).get()).toEqual(['Resumen', 'Aspectos', 'Plan de acción', 'Comparación'])
    links.each((_, el) => {
      const href = $(el).attr('href')!
      expect(href.startsWith('#')).toBe(true)
      expect($(href), href).toHaveLength(1)
    })
  })

  it('sin aspectos a mejorar, "Aspectos" apunta al detalle por apartado', () => {
    expect(reportIndexLinks(false)[1]).toEqual({ href: `#${REPORT_SECTION_IDS.details}`, label: 'Aspectos' })
    expect(reportIndexLinks(true)[1].href).toBe(`#${REPORT_SECTION_IDS.issues}`)
    const clean = buildAuditReport({ url: 'https://ejemplo.com/', createdAt: '2026-11-25T10:30:00.000Z', checks: [checks[3]] })
    const $ = parseHtml(renderToStaticMarkup(<ReportView report={clean} />))
    expect($(`#${REPORT_SECTION_IDS.details}`)).toHaveLength(1)
    expect($(`#${REPORT_SECTION_IDS.issues}`)).toHaveLength(0)
  })
})
