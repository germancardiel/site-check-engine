import { describe, expect, it } from 'vitest'
import { filterAndPaginateSites, matchesSiteQuery, SITES_PAGE_SIZE } from '../filter'

const makeSites = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `site-${i + 1}`,
    name: i % 2 === 0 ? `Proyecto ${i + 1}` : null,
    url: `https://dominio-${i + 1}.es/ruta`,
  }))

describe('matchesSiteQuery y filterAndPaginateSites (CA9)', () => {
  it('SITES_PAGE_SIZE es 10', () => {
    expect(SITES_PAGE_SIZE).toBe(10)
  })

  it('filtra por name, url o displayName ignorando mayúsculas y espacios laterales', () => {
    const site = { name: 'GCA Studio', url: 'https://gcastudio.dev/herramientas' }
    expect(matchesSiteQuery(site, '   ')).toBe(true)
    expect(matchesSiteQuery(site, '  gca  ')).toBe(true)
    expect(matchesSiteQuery(site, 'HERRAMIENTAS')).toBe(true)
    expect(matchesSiteQuery({ name: null, url: 'https://mi-tienda.es' }, 'MI-TIENDA.ES')).toBe(true)
    expect(matchesSiteQuery(site, 'inexistente')).toBe(false)
  })

  it('pagina de 10 en 10 y calcula total, page, totalPages, from y to', () => {
    const sites = makeSites(25)
    const p1 = filterAndPaginateSites(sites, '', 1)
    expect(p1.total).toBe(25)
    expect(p1.totalPages).toBe(3)
    expect(p1.page).toBe(1)
    expect(p1.from).toBe(1)
    expect(p1.to).toBe(10)
    expect(p1.items).toHaveLength(10)
    expect(p1.items[0].id).toBe('site-1')

    const p3 = filterAndPaginateSites(sites, '', 3)
    expect(p3.page).toBe(3)
    expect(p3.from).toBe(21)
    expect(p3.to).toBe(25)
    expect(p3.items).toHaveLength(5)
    expect(p3.items[0].id).toBe('site-21')
  })

  it('hace clamp de la página solicitada al rango [1, totalPages]', () => {
    const sites = makeSites(15)
    expect(filterAndPaginateSites(sites, '', 0).page).toBe(1)
    expect(filterAndPaginateSites(sites, '', -4).page).toBe(1)
    expect(filterAndPaginateSites(sites, '', Number.NaN).page).toBe(1)
    expect(filterAndPaginateSites(sites, '', 99).page).toBe(2)
  })

  it('devuelve estado vacío consistente cuando no hay coincidencias', () => {
    const sites = makeSites(5)
    expect(filterAndPaginateSites(sites, 'no-existe', 3)).toEqual({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
      from: 0,
      to: 0,
    })
  })
})
