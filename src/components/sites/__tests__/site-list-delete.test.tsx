import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'
import { focusActionResult } from '@/lib/form-focus'
import { filterAndPaginateSites, sitesFoundLabel } from '@/lib/sites/filter'
import type { SiteActionState } from '@/lib/validation/site'
import { SitesSkeleton } from '../sites-skeleton'

vi.mock('@/app/(app)/sitios/actions', () => ({ auditSite: vi.fn(), deleteSite: vi.fn() }))

import { SITE_LIST_TITLE_SELECTOR, SiteListView, SiteSearchStatus } from '../site-list'
import type { SiteWithLatestAudit } from '../site-row'

const NOW = new Date('2026-11-25T12:00:00.000Z')
const site: SiteWithLatestAudit = { id: 'site-1', url: 'https://ejemplo.com', name: null, latestAudit: null, cooldown: null }

function render(sites: SiteWithLatestAudit[], deleteState: SiteActionState, remainingAudits: number | null = 12) {
  return parseHtml(
    renderToStaticMarkup(
      <SiteListView sites={sites} now={NOW} remainingAudits={remainingAudits} deleteState={deleteState} deleteAction={() => {}} />,
    ),
  )
}

describe('Borrar sitio: anuncio y foco (CA6)', () => {
  it('tras borrar, la lista anuncia "Sitio borrado." una sola vez con role="status"', () => {
    const $ = render([site], { message: 'Sitio borrado.' })
    // Each row's audit form has its own (empty) status region; only the list's one says something.
    const announcing = $('[role="status"]').filter((_, element) => $(element).text() !== '')
    expect(announcing).toHaveLength(1)
    expect(announcing.text()).toBe('Sitio borrado.')
    expect($('[role="alert"]').text()).toBe('')
    expect($('[aria-live]')).toHaveLength(0)
  })

  it('el anuncio se mantiene aunque se haya borrado el último sitio (estado vacío)', () => {
    const $ = render([], { message: 'Sitio borrado.' })
    expect($('[role="status"]').text()).toBe('Sitio borrado.')
    expect($.text()).toContain('Aún no has añadido ningún sitio.')
  })

  it('un error al borrar se muestra con role="alert" y es enfocable', () => {
    const $ = render([site], { error: 'No se pudo borrar el sitio. Inténtalo de nuevo.' })
    expect($('[role="alert"] [data-form-error]').attr('tabindex')).toBe('-1')
  })

  it('el foco va al título de la lista, que la página hace enfocable', () => {
    const focused: string[] = []
    const page = {
      querySelector: (selector: string) =>
        selector === SITE_LIST_TITLE_SELECTOR ? { focus: () => focused.push('title') } : null,
    }
    expect(focusActionResult(null, page, { message: 'Sitio borrado.' }, SITE_LIST_TITLE_SELECTOR)).toBe(true)
    expect(focused).toEqual(['title'])
    const pageSource = readFileSync(new URL('../../../app/(app)/sitios/page.tsx', import.meta.url), 'utf8')
    expect(pageSource).toMatch(/<h2 id="site-list-title" tabIndex=\{-1\}/)
  })

  it('cada fila usa la action compartida de la lista y la cuota se muestra una vez', () => {
    const $ = render([site, { ...site, id: 'site-2', url: 'https://otro.com' }], {}, 12)
    expect($.text().match(/Te quedan 12 auditorías hoy\./g)).toHaveLength(1)
  })
})

describe('Esqueleto de /sitios (D-UX-10)', () => {
  it('un único role="status" sin aria-live', () => {
    const $ = parseHtml(renderToStaticMarkup(<SitesSkeleton />))
    expect($('[role="status"]')).toHaveLength(1)
    expect($('[aria-live]')).toHaveLength(0)
  })
})

describe('Búsqueda de sitios: número de resultados (T21 CA8)', () => {
  it('la lista tiene una línea role="status" junto al buscador, vacía hasta que el usuario busca', () => {
    const $ = render([site], {})
    const status = $('#site-search').parent().parent().find('[role="status"]')
    expect(status).toHaveLength(1)
    expect(status.text()).toBe('')
  })

  it('tras buscar anuncia "N sitios encontrados" con role="status"', () => {
    const sites = [site, { ...site, id: 'site-2', url: 'https://otro.com' }, { ...site, id: 'site-3', url: 'https://otro.es' }]
    const text = sitesFoundLabel(filterAndPaginateSites(sites, 'otro', 1))
    const $ = parseHtml(renderToStaticMarkup(<SiteSearchStatus text={text} />))
    expect($('[role="status"]').text()).toBe('2 sitios encontrados')
    expect($('[aria-live]')).toHaveLength(0)
  })
})
