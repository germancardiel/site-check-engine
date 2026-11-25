'use client'

import { useEffect } from 'react'
import { bindAnchorReveal } from '@/lib/anchor'
import { CATEGORY_BY_ID } from '@/lib/audit/categories'
import type { AuditIssue, CategoryId, CheckResult } from '@/lib/audit/types'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, CategoryIcon } from './category-icons'
import { CheckStatusBadge, scoreColor } from './check-status-badge'

export function useReportAnchorSync(
  anchorToCategory: Map<string, CategoryId>,
  onRevealCategory: (cat: CategoryId) => void,
) {
  useEffect(
    () =>
      bindAnchorReveal(
        window,
        (id) => anchorToCategory.get(id),
        (cat) => onRevealCategory(cat as CategoryId),
      ),
    [anchorToCategory, onRevealCategory],
  )
}

export function CategoryGrid({
  categories,
  onSelect,
}: {
  categories: Array<{ id: CategoryId; shortTitle: string; score: number | null; issues: number }>
  onSelect: (id: CategoryId) => void
}) {
  return (
    <ul aria-label="Apartados de la auditoría" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            className="flex h-full w-full flex-col gap-2 rounded-md border border-line bg-panel p-3.5 text-left transition-colors duration-200 ease-out hover:border-line-strong hover:bg-ground"
          >
            <span className="flex items-center justify-between">
              <CategoryIcon category={c.id} className="size-4 text-ink-muted" />
              {c.issues > 0 ? (
                <span className="rounded-full border border-warn px-2 py-0.5 font-mono text-[11px] font-medium text-ink tabular-nums">
                  {c.issues}
                </span>
              ) : null}
            </span>
            <span className="text-xs leading-tight text-ink-muted">
              {CATEGORY_BY_ID[c.id].number}. {c.shortTitle}
            </span>
            <span className={cn('font-display text-2xl font-semibold tracking-display tabular-nums', scoreColor(c.score))}>
              {c.score ?? 'N/A'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function IssuesSection({
  issues,
  checksById,
  onSelectIssue,
}: {
  issues: AuditIssue[]
  checksById: Map<string, CheckResult>
  onSelectIssue: (category: CategoryId, checkId: string) => void
}) {
  if (issues.length === 0) return null
  return (
    <section aria-labelledby="issues-title" className="rounded-md border border-line bg-panel p-5 md:p-6">
      <h2 id="issues-title" className="font-display text-xl font-semibold tracking-display text-ink">
        Aspectos a mejorar <span className="font-serif font-normal text-ink-muted">({issues.length})</span>
      </h2>
      <p className="mt-1 text-sm text-ink-muted">Ordenados por impacto: empieza por arriba.</p>
      <ol className="mt-4 divide-y divide-line">
        {issues.map((i) => (
          <li key={i.checkId}>
            <button
              type="button"
              onClick={() => onSelectIssue(i.category, i.checkId)}
              className="group flex w-full items-center gap-3 py-2.5 text-left"
            >
              <CheckStatusBadge status={i.status} />
              <span className="flex-1 text-sm text-ink">
                <span className="text-ink-muted">{CATEGORY_BY_ID[i.category].shortTitle} · </span>
                {i.title}
              </span>
              <ArrowRightIcon className="text-ink-muted transition-transform group-hover:translate-x-0.5" />
            </button>
            {checksById.get(i.checkId)?.message ? (
              <p className="-mt-1 pb-2.5 pl-1 text-xs leading-relaxed text-ink-muted sm:pl-[112px]">
                {checksById.get(i.checkId)!.message}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
