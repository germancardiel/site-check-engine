'use client'

import { unstable_rethrow } from 'next/navigation'
import { useActionState, useState, type Ref } from 'react'
import { deleteSite } from '@/app/(app)/sitios/actions'
import { buttonClass } from '@/components/ui/button-styles'
import { FormFeedback } from '@/components/ui/form-feedback'
import { INPUT_CLASS } from '@/components/ui/text-field'
import { useFocusActionResult } from '@/components/ui/use-focus-action-result'
import { NETWORK_ERROR, withNetworkFallback } from '@/lib/action-safety'
import { auditQuotaLabel } from '@/lib/sites/audit-availability'
import { filterAndPaginateSites, SITES_PAGE_SIZE } from '@/lib/sites/filter'
import type { SiteActionState } from '@/lib/validation/site'
import { SiteRow, type SiteWithLatestAudit } from './site-row'

const INITIAL_DELETE_STATE: SiteActionState = {}

const safeDeleteSite = withNetworkFallback<SiteActionState>(deleteSite, () => ({ error: NETWORK_ERROR }), unstable_rethrow)

/** Heading of the list (rendered by the page with `tabIndex={-1}`): the focus goes there after a delete. */
export const SITE_LIST_TITLE_SELECTOR = '#site-list-title'

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

type SiteTableProps = Pick<SiteListViewProps, 'sites' | 'now' | 'remainingAudits' | 'deleteAction'>

function SiteTable({ sites, now, remainingAudits, deleteAction }: SiteTableProps) {
  return (
    <>
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
        {sites.map((site) => (
          <SiteRow key={site.id} site={site} now={now} remainingAudits={remainingAudits} deleteAction={deleteAction} />
        ))}
      </ul>
    </>
  )
}

type SiteListViewProps = {
  sites: SiteWithLatestAudit[]
  now: Date
  remainingAudits: number | null
  deleteState: SiteActionState
  deleteAction: (formData: FormData) => void
  feedbackRef?: Ref<HTMLDivElement>
}

/**
 * Searchable, paginated list of sites. The result of deleting a site is announced here, once
 * ("Sitio borrado." with `role="status"`), because the deleted row disappears (D-UX-10).
 */
export function SiteListView({ sites, now, remainingAudits, deleteState, deleteAction, feedbackRef }: SiteListViewProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const feedback = (
    <div ref={feedbackRef}>
      <FormFeedback error={deleteState.error} message={deleteState.message} />
    </div>
  )
  if (sites.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {feedback}
        <EmptySitesState />
      </div>
    )
  }

  const paged = filterAndPaginateSites(sites, query, page, SITES_PAGE_SIZE)
  const updateQuery = (next: string) => {
    setQuery(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5">
      {feedback}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <SiteSearchField value={query} onChange={updateQuery} />
        {remainingAudits !== null ? <p className="text-sm text-ink-muted">{auditQuotaLabel(remainingAudits)}</p> : null}
      </div>
      {paged.total === 0 ? (
        <NoMatchesState query={query} onClear={() => updateQuery('')} />
      ) : (
        <div className="flex flex-col gap-4">
          <SiteTable sites={paged.items} now={now} remainingAudits={remainingAudits} deleteAction={deleteAction} />
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

type SiteListProps = { sites: SiteWithLatestAudit[]; now: Date; remainingAudits: number | null }

export function SiteList(props: SiteListProps) {
  const [deleteState, deleteAction] = useActionState(safeDeleteSite, INITIAL_DELETE_STATE)
  const feedbackRef = useFocusActionResult<HTMLDivElement>(deleteState, SITE_LIST_TITLE_SELECTOR)
  return <SiteListView {...props} deleteState={deleteState} deleteAction={deleteAction} feedbackRef={feedbackRef} />
}
