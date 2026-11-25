'use client'

import { useState } from 'react'
import { buttonClass } from '@/components/ui/button-styles'
import { INPUT_CLASS } from '@/components/ui/text-field'
import { filterAndPaginateSites, SITES_PAGE_SIZE } from '@/lib/sites/filter'
import { SiteRow, type SiteWithLatestAudit } from './site-row'

const COLUMNS = 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_9.5rem_12rem] lg:gap-8'

function EmptySitesState() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-line p-6 sm:p-8">
      <p className="text-lg font-semibold text-ink">Aún no has añadido ningún sitio.</p>
      <p className="max-w-prose text-ink-muted">
        Escribe la dirección de tu web en el formulario de arriba y pulsa Añadir. Después, audítala para obtener su
        primera nota de SEO y de IA.
      </p>
      <a href="#site-url" className={buttonClass('secondary', 'mt-2')}>
        Añadir el primer sitio
      </a>
    </div>
  )
}

function PaginationBar({
  page,
  totalPages,
  from,
  to,
  total,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  from: number
  to: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav
      aria-label="Paginación de sitios"
      className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4"
    >
      <p className="text-sm text-ink-muted">
        Mostrando <span className="font-mono text-ink tabular-nums">{from}–{to}</span> de{' '}
        <span className="font-mono text-ink tabular-nums">{total}</span> · Página{' '}
        <span className="font-mono text-ink tabular-nums">{page}</span> de{' '}
        <span className="font-mono text-ink tabular-nums">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className={buttonClass('secondary', 'px-3 py-1.5')}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className={buttonClass('secondary', 'px-3 py-1.5')}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}

function NoMatchesState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-line p-6">
      <p className="text-base font-medium text-ink">No hay sitios que coincidan con «{query.trim()}».</p>
      <button type="button" onClick={onClear} className={buttonClass('secondary')}>
        Limpiar búsqueda
      </button>
    </div>
  )
}

function SiteSearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5 sm:max-w-md">
      <label htmlFor="site-search" className="text-sm font-medium text-ink">
        Buscar sitio por nombre o URL
      </label>
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej. gcastudio.dev o Mi tienda"
        className={INPUT_CLASS}
      />
    </div>
  )
}

export function SiteList({ sites, now }: { sites: SiteWithLatestAudit[]; now: Date }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  if (sites.length === 0) return <EmptySitesState />

  const paged = filterAndPaginateSites(sites, query, page, SITES_PAGE_SIZE)
  const updateQuery = (next: string) => {
    setQuery(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5">
      <SiteSearchField value={query} onChange={updateQuery} />
      {paged.total === 0 ? (
        <NoMatchesState query={query} onClear={() => updateQuery('')} />
      ) : (
        <div className="flex flex-col gap-4">
          <div
            aria-hidden="true"
            className={`hidden border-b border-line-strong pb-2 font-mono text-xs tracking-wider text-ink-muted uppercase lg:grid ${COLUMNS}`}
          >
            <span>Sitio</span>
            <span>Última nota</span>
            <span>Auditado</span>
            <span>Acciones</span>
          </div>
          <ul>
            {paged.items.map((site) => (
              <SiteRow key={site.id} site={site} now={now} />
            ))}
          </ul>
          <PaginationBar
            page={paged.page}
            totalPages={paged.totalPages}
            from={paged.from}
            to={paged.to}
            total={paged.total}
            onPrev={() => setPage(Math.max(1, paged.page - 1))}
            onNext={() => setPage(Math.min(paged.totalPages, paged.page + 1))}
          />
        </div>
      )}
    </div>
  )
}
