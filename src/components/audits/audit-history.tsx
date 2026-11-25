import Link from 'next/link'
import { StatusIcon } from '@/components/ui/status-icon'
import type { HistoryEntry } from '@/lib/audit/history'
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/format'
import { ScoreDelta } from './score-delta'

const LINK_CLASS =
  'rounded-sm text-sm font-medium text-ink underline decoration-line-strong transition-colors duration-200 ease-out hover:decoration-ink'

function EntryScores({ entry }: { entry: HistoryEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      <dl className="flex gap-4 font-mono text-sm tabular-nums">
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">Nota</dt>
          <dd className="font-medium text-accent-text">{entry.score ?? '–'}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">SEO</dt>
          <dd className="text-ink">{entry.seo_score ?? '–'}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">IA</dt>
          <dd className="text-ink">{entry.ai_score ?? '–'}</dd>
        </div>
      </dl>
      <ScoreDelta delta={entry.scoreDelta} />
    </div>
  )
}

function HistoryItem({ entry, siteId, now }: { entry: HistoryEntry; siteId: string; now: Date }) {
  const absolute = formatAbsoluteDate(entry.created_at)

  return (
    <li className="grid gap-3 border-b border-line py-4 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <time dateTime={entry.created_at} className="font-mono text-sm text-ink tabular-nums">
          {absolute}
        </time>
        <span className="text-xs text-ink-muted">{formatRelativeTime(entry.created_at, now)}</span>
      </div>
      {entry.status === 'error' ? (
        <p className="flex min-w-0 items-start gap-2 text-sm">
          <StatusIcon status="fail" className="mt-0.5" />
          <span className="min-w-0 break-words text-ink-muted">
            <span className="font-medium text-ink">Auditoría fallida:</span> {entry.error ?? 'Error desconocido.'}
          </span>
        </p>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <StatusIcon status="pass" />
          <span className="sr-only">Completada.</span>
          <EntryScores entry={entry} />
        </div>
      )}
      <Link href={`/sitios/${siteId}/auditorias/${entry.id}`} className={LINK_CLASS}>
        Ver detalle<span className="sr-only"> de la auditoría del {absolute}</span>
      </Link>
    </li>
  )
}

/** Most recent audits of a site, each with its score change against the previous `ok` one. */
export function AuditHistory({ entries, siteId, now }: { entries: HistoryEntry[]; siteId: string; now: Date }) {
  return (
    <ol className="border-t border-line-strong">
      {entries.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} siteId={siteId} now={now} />
      ))}
    </ol>
  )
}
