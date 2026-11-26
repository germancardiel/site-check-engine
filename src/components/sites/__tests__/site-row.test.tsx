import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'

vi.mock('@/app/(app)/sitios/actions', () => ({
  auditSite: vi.fn(),
  deleteSite: vi.fn(),
}))

import { SiteList } from '../site-list'
import { SiteRow, type SiteWithLatestAudit } from '../site-row'

const NOW = new Date('2026-11-25T12:00:00.000Z')

const sampleSite: SiteWithLatestAudit = {
  id: 'site-123',
  url: 'https://gcastudio.dev',
  name: 'GCA Studio',
  latestAudit: {
    id: 'audit-456',
    status: 'ok',
    score: 92,
    seo_score: 94,
    ai_score: 88,
    error: null,
    created_at: '2026-11-25T11:30:00.000Z',
  },
  cooldown: null,
}

const noop = () => {}
const rowProps = { now: NOW, remainingAudits: 15, deleteAction: noop }

describe('SiteRow (CA8)', () => {
  it('renderiza el enlace en el título, el enlace explícito "Historial y evolución" a /sitios/[siteId] y diferencia el botón primario "Ver informe" del botón secundario "Auditar"', () => {
    const html = renderToStaticMarkup(<SiteRow site={sampleSite} {...rowProps} />)
    const $ = parseHtml(html)

    const siteLinks = $('a[href="/sitios/site-123"]')
    expect(siteLinks).toHaveLength(2)
    expect(siteLinks.first().text()).toBe('GCA Studio')
    expect(siteLinks.last().text()).toContain('Historial y evolución')

    const reportBtn = $('a[href="/sitios/site-123/auditorias/audit-456"]')
    expect(reportBtn).toHaveLength(1)
    expect(reportBtn.text()).toContain('Ver informe')
    expect(reportBtn.attr('class')).toContain('min-h-10')
    expect(reportBtn.attr('class')).toContain('bg-accent')
    expect(reportBtn.attr('class')).toContain('text-on-accent')

    const auditBtn = $('form[aria-label="Auditar GCA Studio"] button[type="submit"]')
    expect(auditBtn).toHaveLength(1)
    expect(auditBtn.attr('class')).toContain('border-line-strong')
    expect(auditBtn.attr('class')).not.toContain('bg-accent')
  })

  it('muestra "Ver el error" con estilo de botón primario cuando la última auditoría falló y pasa "Auditar" a primario cuando aún no hay auditorías', () => {
    const failedSite: SiteWithLatestAudit = {
      ...sampleSite,
      latestAudit: {
        ...sampleSite.latestAudit!,
        status: 'error',
        error: 'Timeout',
      },
    }
    const failedHtml = renderToStaticMarkup(<SiteRow site={failedSite} {...rowProps} />)
    const $failed = parseHtml(failedHtml)
    const errBtn = $failed('a[href="/sitios/site-123/auditorias/audit-456"]')
    expect(errBtn.text()).toContain('Ver el error')
    expect(errBtn.attr('class')).toContain('bg-accent')

    const emptyHtml = renderToStaticMarkup(<SiteRow site={{ ...sampleSite, latestAudit: null }} {...rowProps} />)
    const $empty = parseHtml(emptyHtml)
    expect($empty('a[href="/sitios/site-123"]').last().text()).toContain('Historial y evolución')
    expect($empty('a[href*="/auditorias/"]')).toHaveLength(0)
    const emptyAuditBtn = $empty('form[aria-label="Auditar GCA Studio"] button[type="submit"]')
    expect(emptyAuditBtn.attr('class')).toContain('bg-accent')
  })
})

describe('SiteList — buscador y paginación (CA9)', () => {
  it('renderiza el campo de búsqueda con label asociado y pagina cuando hay más de 10 sitios', () => {
    const manySites: SiteWithLatestAudit[] = Array.from({ length: 14 }, (_, i) => ({
      ...sampleSite,
      id: `site-${i + 1}`,
      name: `Sitio ${i + 1}`,
      url: `https://sitio-${i + 1}.es`,
    }))
    const html = renderToStaticMarkup(<SiteList sites={manySites} now={NOW} remainingAudits={15} />)
    const $ = parseHtml(html)

    expect($('label[for="site-search"]').text()).toContain('Buscar sitio')
    expect($('input#site-search[type="search"]')).toHaveLength(1)
    expect($('ul > li')).toHaveLength(10)

    const nav = $('nav[aria-label="Paginación de sitios"]')
    expect(nav).toHaveLength(1)
    expect(nav.text()).toContain('1–10')
    expect(nav.text()).toContain('14')
    expect(nav.text()).toContain('Anterior')
    expect(nav.text()).toContain('Siguiente')

    const prevBtn = nav.find('button').first()
    expect(prevBtn.attr('disabled')).toBeDefined()
    expect(prevBtn.attr('class')).toContain('disabled:text-ink-muted')
    expect(prevBtn.attr('class')).not.toContain('opacity-')
  })

  it('muestra el estado vacío cuando no hay sitios añadidos', () => {
    const html = renderToStaticMarkup(<SiteList sites={[]} now={NOW} remainingAudits={15} />)
    expect(html).toContain('Aún no has añadido ningún sitio.')
  })
})
