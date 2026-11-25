import Link from 'next/link'
import type { HistoryEntry } from '@/lib/audit/history'
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/format'
import { AuditScores } from './audit-scores'
import { ScoreDelta } from './score-delta'

const LINK_CLASS =
  'rounded-sm text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-100 dark:hover:text-zinc-300 dark:focus-visible:outline-white'

function HistoryItem({ entry, siteId, now }: { entry: HistoryEntry; siteId: string; now: Date }) {
  const absolute = formatAbsoluteDate(entry.created_at)

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 flex-col gap-1">
        <time dateTime={entry.created_at} className="font-medium text-zinc-900 dark:text-zinc-100">
          {absolute}
        </time>
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatRelativeTime(entry.created_at, now)}</span>
        {entry.status === 'error' ? (
          <p className="text-sm break-words text-red-800 dark:text-red-300">
            <span className="font-medium">
              <span aria-hidden="true">✕ </span>Auditoría fallida:
            </span>{' '}
            {entry.error ?? 'Error desconocido.'}
          </p>
        ) : (
          <p className="text-sm text-green-800 dark:text-green-300">
            <span aria-hidden="true">✓ </span>Completada
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {entry.status === 'ok' ? (
          <div className="flex flex-wrap items-end gap-3">
            <AuditScores score={entry.score} seoScore={entry.seo_score} aiScore={entry.ai_score} />
            <ScoreDelta delta={entry.scoreDelta} />
          </div>
        ) : null}
        <Link href={`/sitios/${siteId}/auditorias/${entry.id}`} className={LINK_CLASS}>
          Ver detalle<span className="sr-only"> de la auditoría del {absolute}</span>
        </Link>
      </div>
    </li>
  )
}

/** Most recent audits of a site, each with its score change against the previous `ok` one. */
export function AuditHistory({ entries, siteId, now }: { entries: HistoryEntry[]; siteId: string; now: Date }) {
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} siteId={siteId} now={now} />
      ))}
    </ol>
  )
}
