import { siteDisplayName } from '@/lib/format'

export const SITES_PAGE_SIZE = 10

export type FilterableSite = {
  url: string
  name: string | null
}

export type PaginatedSites<T> = {
  items: T[]
  total: number
  page: number
  totalPages: number
  from: number
  to: number
}

/** True when `site` matches `query` by name, URL or display name (case-insensitive). */
export function matchesSiteQuery(site: FilterableSite, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const name = (site.name ?? '').toLowerCase()
  const url = site.url.toLowerCase()
  const display = siteDisplayName(site.name, site.url).toLowerCase()
  return name.includes(q) || url.includes(q) || display.includes(q)
}

/** Filters `sites` by `query` and returns the slice for `requestedPage` (1-indexed, clamped). */
export function filterAndPaginateSites<T extends FilterableSite>(
  sites: readonly T[],
  query: string,
  requestedPage: number,
  pageSize: number = SITES_PAGE_SIZE,
): PaginatedSites<T> {
  const safeSize = Math.max(1, Math.floor(pageSize))
  const filtered = query.trim() === '' ? [...sites] : sites.filter((s) => matchesSiteQuery(s, query))
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / safeSize))
  const rawPage = Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1
  const page = Math.min(totalPages, Math.max(1, rawPage))
  if (total === 0) {
    return { items: [], total: 0, page: 1, totalPages: 1, from: 0, to: 0 }
  }
  const startIndex = (page - 1) * safeSize
  const items = filtered.slice(startIndex, startIndex + safeSize)
  return {
    items,
    total,
    page,
    totalPages,
    from: startIndex + 1,
    to: startIndex + items.length,
  }
}

/** Text of the `role="status"` line of the site search: "3 sitios encontrados · página 1 de 2". */
export function sitesFoundLabel(result: Pick<PaginatedSites<unknown>, 'total' | 'page' | 'totalPages'>): string {
  const { total, page, totalPages } = result
  const count = total === 0 ? 'Ningún sitio encontrado' : `${total} ${total === 1 ? 'sitio encontrado' : 'sitios encontrados'}`
  return totalPages > 1 ? `${count} · página ${page} de ${totalPages}` : count
}
