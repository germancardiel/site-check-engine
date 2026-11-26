'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { buttonClass } from '@/components/ui/button-styles'
import { jumpToAnchor } from '@/lib/anchor'
import { AI_SCORE_HELP, checkAnchorId, reportToMarkdown } from '@/lib/audit/present'
import { downloadTextFile } from '@/lib/download'
import type { AuditReport, CategoryId, CategoryResult } from '@/lib/audit/types'
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CategoryAccordion } from './category-accordion'
import { DownloadIcon } from './category-icons'
import { scoreColor } from './check-status-badge'
import { REPORT_SECTION_IDS } from './report-anchors'
import { CategoryGrid, IssuesSection, useReportAnchorSync } from './report-sections'
import { ScoreGauge } from './score-gauge'

export type ReportViewProps = {
  report: AuditReport
  previous?: { score: number | null; date: string } | null
  relativeTime?: string
  now?: Date
  reAuditAction?: ReactNode
}

function downloadMarkdown(report: AuditReport) {
  let host = 'sitio'
  try {
    host = new URL(report.finalUrl).hostname
  } catch {
    /* fallback */
  }
  downloadTextFile(reportToMarkdown(report), `auditoria-seo-${host}.md`)
}

/** Text buttons ("Expandir todo"…) with a 40 px touch target. */
const TEXT_BUTTON_CLASS =
  'inline-flex min-h-10 items-center rounded-sm text-ink-muted underline decoration-line-strong hover:text-ink hover:decoration-ink'

function ReportAlerts({
  report,
  previous,
}: {
  report: AuditReport
  previous?: { score: number | null; date: string } | null
}) {
  const delta = previous && previous.score !== null ? Math.round((report.score - previous.score) * 10) / 10 : null
  return (
    <>
      {delta !== null && previous ? (
        <p className="text-sm text-ink-muted">
          <span className={cn('font-mono font-semibold', delta > 0 ? 'text-pass' : delta < 0 ? 'text-fail' : 'text-ink')}>
            {delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : '= '}
            {delta}
          </span>{' '}
          desde tu última auditoría ({previous.score}, {formatAbsoluteDate(previous.date)})
        </p>
      ) : null}
      {report.capReason ? (
        <p className="rounded-md border border-fail bg-ground px-3 py-2 text-sm text-ink">
          Puntuación limitada a 40: {report.capReason}. Hasta resolverlo, Google no mostrará esta página.
        </p>
      ) : null}
      {report.notices.map((n) => (
        <p key={n} className="rounded-md border border-warn bg-ground px-3 py-2 text-sm text-ink">
          {n}
        </p>
      ))}
    </>
  )
}

function ReportHeader({
  report,
  previous,
  rel,
  reAuditAction,
}: {
  report: AuditReport
  previous?: { score: number | null; date: string } | null
  rel: string
  reAuditAction?: ReactNode
}) {
  const issuesMsg =
    report.issues.length === 0
      ? 'No se han detectado aspectos a mejorar.'
      : `${report.issues.length} aspecto${report.issues.length === 1 ? '' : 's'} a mejorar detectado${report.issues.length === 1 ? '' : 's'}: revísalos abajo.`

  return (
    <section
      id={REPORT_SECTION_IDS.summary}
      tabIndex={-1}
      aria-labelledby="report-summary-title"
      className="flex scroll-mt-24 flex-col gap-6 rounded-md border border-line bg-panel p-5 md:flex-row md:items-center md:p-7"
    >
      <h2 id="report-summary-title" className="sr-only">
        Resumen de la auditoría
      </h2>
      <ScoreGauge score={report.score} />
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className={cn('font-display text-2xl font-semibold tracking-display', scoreColor(report.score))}>
          {report.label}
        </p>
        <p className="font-mono text-sm break-all text-ink-muted">{report.finalUrl}</p>
        <p className="text-[15px] text-ink">{issuesMsg}</p>
        <p className="text-sm text-ink-muted">
          Auditada el{' '}
          <time dateTime={report.auditedAt} className="font-mono text-ink tabular-nums">
            {formatAbsoluteDate(report.auditedAt)}
          </time>
          {rel ? ` · ${rel}` : ''}
          {' · '}
          <span className="font-mono text-xs text-ink-muted">
            SEO {report.seoScore}/100 · IA {report.aiScore}/100
          </span>
        </p>
        <p className="text-xs text-ink-muted">{AI_SCORE_HELP}</p>
        <ReportAlerts report={report} previous={previous} />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" onClick={() => downloadMarkdown(report)} className={cn(buttonClass('secondary'), 'gap-2')}>
            <DownloadIcon />
            Descargar informe (Markdown)
          </button>
          {reAuditAction}
        </div>
      </div>
    </section>
  )
}

function CategoryDetailsSection({
  categories,
  open,
  onToggle,
  onExpandAll,
  onCollapseAll,
}: {
  categories: CategoryResult[]
  open: Set<CategoryId>
  onToggle: (id: CategoryId) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}) {
  return (
    <section id={REPORT_SECTION_IDS.details} tabIndex={-1} aria-labelledby="detail-title" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="detail-title" className="font-display text-xl font-semibold tracking-display text-ink">
          Detalle por apartado
        </h2>
        <div className="flex gap-4 text-sm">
          <button type="button" className={TEXT_BUTTON_CLASS} onClick={onExpandAll}>
            Expandir todo
          </button>
          <button type="button" className={TEXT_BUTTON_CLASS} onClick={onCollapseAll}>
            Colapsar todo
          </button>
        </div>
      </div>
      {categories.map((c) => (
        <CategoryAccordion key={c.id} category={c} open={open.has(c.id)} onToggle={() => onToggle(c.id)} />
      ))}
    </section>
  )
}

/** Anchors of the report: categories and checks open their category; the sections open nothing (`null`). */
function buildAnchorCategoryMap(categories: CategoryResult[]): Map<string, CategoryId | null> {
  const map = new Map<string, CategoryId | null>(Object.values(REPORT_SECTION_IDS).map((id) => [id, null]))
  for (const cat of categories) {
    map.set(`cat-${cat.id}`, cat.id)
    for (const ch of cat.checks) map.set(checkAnchorId(ch.id), cat.id)
  }
  return map
}

export function ReportView({ report, previous, relativeTime, now, reAuditAction }: ReportViewProps) {
  const [open, setOpen] = useState<Set<CategoryId>>(() => new Set())
  const anchorToCategory = useMemo(() => buildAnchorCategoryMap(report.categories), [report.categories])
  const checksById = useMemo(
    () => new Map(report.categories.flatMap((c) => c.checks.map((ch) => [ch.id, ch] as const))),
    [report.categories],
  )
  const revealCategory = useCallback((cat: CategoryId) => setOpen((s) => new Set(s).add(cat)), [])

  useReportAnchorSync(anchorToCategory, revealCategory)

  const toggle = (id: CategoryId) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const openAndScroll = (categoryId: CategoryId, targetElementId = `cat-${categoryId}`) => {
    setOpen((s) => new Set(s).add(categoryId))
    // The focus follows the jump; instant scroll with prefers-reduced-motion (`jumpToAnchor`).
    requestAnimationFrame(() => jumpToAnchor(window, targetElementId))
  }

  const rel = relativeTime ?? (now ? formatRelativeTime(report.auditedAt, now) : '')

  return (
    <div className="flex flex-col gap-8">
      <ReportHeader report={report} previous={previous} rel={rel} reAuditAction={reAuditAction} />
      <CategoryGrid categories={report.categories} onSelect={(id) => openAndScroll(id)} />
      <IssuesSection
        issues={report.issues}
        checksById={checksById}
        onSelectIssue={(cat, checkId) => openAndScroll(cat, checkAnchorId(checkId))}
      />
      <CategoryDetailsSection
        categories={report.categories}
        open={open}
        onToggle={toggle}
        onExpandAll={() => setOpen(new Set(report.categories.map((c) => c.id)))}
        onCollapseAll={() => setOpen(new Set())}
      />
    </div>
  )
}
