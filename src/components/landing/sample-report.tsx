import type { CSSProperties } from 'react'
import { ScoreMeter } from '@/components/ui/score-meter'
import { StatusIcon } from '@/components/ui/status-icon'
import { CHECK_STATUS_LABEL } from '@/lib/audit/present'
import { buildSpecimen, type SpecimenRow } from '@/lib/specimen'

const PREVIEW_CHECK_IDS = [
  'crawl.status',
  'crawl.robots-txt',
  'crawl.canonical',
  'crawl.sitemap',
  'onpage.title',
  'onpage.description',
  'onpage.headings',
  'onpage.og',
  'content.readability',
  'content.alt',
  'schema.detected',
  'schema.identity',
  'perf.ttfb',
  'mobile.viewport',
  'trust.https',
  'ai.robots',
  'ai.ssr',
  'ai.llms',
  'ai.webmcp',
]

/** Animation step of an element (the CSS turns it into a delay). */
function step(index: number): CSSProperties {
  return { '--step': index } as CSSProperties
}

function PendingMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4 text-line-strong">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth={1.75} strokeDasharray="2.5 2.5" />
    </svg>
  )
}

function SpecimenItem({ row, index }: { row: SpecimenRow; index: number }) {
  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-1.5 first:border-t-0">
      <span className="grid">
        <span aria-hidden="true" className="specimen-pending col-start-1 row-start-1" style={step(index)}>
          <PendingMark />
        </span>
        <span className="specimen-resolved col-start-1 row-start-1" style={step(index)}>
          <StatusIcon status={row.status} />
        </span>
      </span>
      <span className="truncate font-mono text-[0.8125rem] text-ink">{row.id}</span>
      <span className="grid justify-items-end text-xs text-ink-muted">
        <span aria-hidden="true" className="specimen-pending col-start-1 row-start-1 font-mono" style={step(index)}>
          …
        </span>
        <span className="specimen-resolved col-start-1 row-start-1" style={step(index)}>
          {CHECK_STATUS_LABEL[row.status]}
        </span>
      </span>
    </li>
  )
}

/** Sample report of the landing: representative subset of checks resolving row by row. */
export function SampleReport() {
  const specimen = buildSpecimen()
  const byId = new Map(specimen.rows.map((r) => [r.id, r]))
  const previewRows = PREVIEW_CHECK_IDS.map((id) => byId.get(id)).filter((r): r is SpecimenRow => Boolean(r))

  return (
    <figure aria-labelledby="informe-ejemplo" className="w-full rounded-md border border-line bg-panel">
      <figcaption
        id="informe-ejemplo"
        className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 font-mono text-xs tracking-wider text-ink-muted uppercase sm:px-5"
      >
        <span>Informe de ejemplo · 10 apartados</span>
        <span aria-hidden="true" className="normal-case tracking-normal">
          tu-web.es
        </span>
      </figcaption>
      <div
        className="specimen-resolved grid grid-cols-2 gap-5 border-b border-line px-4 py-4 sm:px-5"
        style={step(previewRows.length)}
      >
        <ScoreMeter label="Nota SEO" value={specimen.seoScore} size="lg" />
        <ScoreMeter label="Nota IA" value={specimen.aiScore} size="lg" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">
          Muestra de {previewRows.length} de {specimen.rows.length} checks
        </p>
        <ol>
          {previewRows.map((row, index) => (
            <SpecimenItem key={row.id} row={row} index={index} />
          ))}
        </ol>
      </div>
    </figure>
  )
}
