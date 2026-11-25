import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CategoryAccordion } from '../category-accordion'
import { CheckRow } from '../check-row'
import { ReportView } from '../report-view'
import { buildAuditReport } from '@/lib/audit/present'
import { parseHtml } from '@/lib/audit/parse'
import type { CheckResult } from '@/lib/audit/types'

const sampleChecks: CheckResult[] = [
  {
    id: 'crawl.noindex',
    category: 'crawl',
    title: 'Meta robots / X-Robots-Tag (noindex, nofollow)',
    status: 'fail',
    weight: 3,
    message: 'La página tiene la directiva noindex: Google no la mostrará en los resultados.',
    evidence: "meta robots='noindex' | X-Robots-Tag=''",
    items: [{ label: 'robots', value: 'noindex', status: 'bad' }],
    fix: 'Quita "noindex" de la etiqueta <meta name="robots">.',
    docs: [{ label: 'Google Search Central: meta robots', url: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag' }],
    recommendation: 'Quita "noindex" de la etiqueta <meta name="robots">.',
  },
  {
    id: 'onpage.title',
    category: 'onpage',
    title: 'Title con longitud adecuada',
    status: 'warn',
    weight: 3,
    message: 'El title tiene 20 caracteres: es corto.',
    evidence: '"Título corto"',
    fix: '<title>Título descriptivo de entre 30 y 60 caracteres</title>',
    docs: [{ label: 'Google Search Central: título', url: 'https://developers.google.com/search/docs/appearance/title-link' }],
    recommendation: '<title>Título descriptivo de entre 30 y 60 caracteres</title>',
  },
  {
    id: 'ai.llms',
    category: 'ai',
    title: 'Archivo llms.txt',
    status: 'pass',
    weight: 1,
    message: 'Se ha encontrado https://ejemplo.com/llms.txt.',
    docs: [{ label: 'llms.txt', url: 'https://llmstxt.org/' }],
    recommendation: 'No hace falta ninguna acción.',
  },
]

describe('ReportView, CategoryAccordion y CheckRow (CA5)', () => {
  const report = buildAuditReport({
    url: 'https://ejemplo.com/',
    createdAt: '2026-11-25T10:30:00.000Z',
    checks: sampleChecks,
    notices: ['Rendimiento parcial: PageSpeed no disponible.'],
  })

  it('renderiza ScoreGauge, etiqueta, URL, variación frente a anterior, capReason, notices y botones de acción', () => {
    const html = renderToStaticMarkup(
      <ReportView
        report={report}
        previous={{ score: 35, date: '2026-11-24T10:30:00.000Z' }}
        relativeTime="hace 2 horas"
        reAuditAction={<button type="button">Volver a auditar</button>}
      />,
    )
    const $ = parseHtml(html)
    expect($('[role="meter"][aria-label="Puntuación global"]').attr('aria-valuenow')).toBe('40')
    expect(html).toContain('Deficiente')
    expect(html).toContain('https://ejemplo.com/')
    expect(html).toContain('2 aspectos a mejorar detectados')
    expect(html).toContain('↑ +5')
    expect(html).toContain('Nota limitada a 40: La página tiene la directiva noindex')
    expect(html).toContain('Rendimiento parcial: PageSpeed no disponible.')
    expect(html).toContain('Descargar .md')
    expect(html).toContain('Volver a auditar')
  })

  it('renderiza las 10 tarjetas de apartado, Aspectos a mejorar ordenados por impacto y Detalle por apartado con Expandir/Colapsar', () => {
    const html = renderToStaticMarkup(<ReportView report={report} />)
    const $ = parseHtml(html)
    const cards = $('ul[aria-label="Apartados de la auditoría"] > li')
    expect(cards).toHaveLength(10)
    expect(cards.first().text()).toContain('1. Rastreo')
    expect(cards.last().text()).toContain('10. AI SEO')

    const issues = $('section[aria-labelledby="issues-title"] li')
    expect(issues).toHaveLength(2)
    expect(issues.first().text()).toContain('Meta robots')
    expect(issues.last().text()).toContain('Title con longitud adecuada')

    expect(html).toContain('Detalle por apartado')
    expect(html).toContain('Expandir todo')
    expect(html).toContain('Colapsar todo')
    expect($('section[id^="cat-"]')).toHaveLength(10)
  })

  it('CheckRow y CategoryAccordion abierto muestran evidence, items, Cómo arreglarlo y enlaces de bibliografía oficial', () => {
    const crawlCat = report.categories.find((c) => c.id === 'crawl')!
    const html = renderToStaticMarkup(<CategoryAccordion category={crawlCat} open={true} onToggle={() => {}} />)
    expect(html).toContain('id="check-crawl-noindex"')
    expect(html).toContain("meta robots=&#x27;noindex&#x27;")
    expect(html).toContain('robots')
    expect(html).toContain('Cómo arreglarlo')
    expect(html).toContain('Google Search Central: meta robots')

    const passHtml = renderToStaticMarkup(<CheckRow check={sampleChecks[2]} />)
    expect(passHtml).toContain('Correcto')
    expect(passHtml).not.toContain('Cómo arreglarlo')
  })
})
