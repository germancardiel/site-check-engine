import type { AuditDiff, CheckChange } from '@/lib/audit/diff'
import { CHECK_CATEGORY_LABEL, hasCheckChanges } from '@/lib/audit/present'
import { formatAbsoluteDate } from '@/lib/format'
import { CheckStatusBadge } from './check-status-badge'
import { ScoreDelta } from './score-delta'

function DeltaItem({ label, delta }: { label: string; delta: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-sm text-zinc-700 dark:text-zinc-300">{label}</dt>
      <dd>{delta === null ? <span className="text-sm">–</span> : <ScoreDelta delta={delta} />}</dd>
    </div>
  )
}

type ChangeListProps = { title: string; changes: CheckChange[] }

function ChangeList({ title, changes }: ChangeListProps) {
  if (changes.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
        {title} ({changes.length})
      </h4>
      <ul className="flex flex-col gap-2">
        {changes.map((change) => (
          <li
            key={change.id}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
          >
            <span className="text-sm break-words text-zinc-900 dark:text-zinc-100">
              {change.title}{' '}
              <span className="text-zinc-700 dark:text-zinc-300">({CHECK_CATEGORY_LABEL[change.category]})</span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              {change.from ? <CheckStatusBadge status={change.from} /> : <span>No existía</span>}
              <span aria-hidden="true">→</span>
              <span className="sr-only">pasa a</span>
              {change.to ? <CheckStatusBadge status={change.to} /> : <span>Ya no se comprueba</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type AuditComparisonProps = {
  since: string
  diff: AuditDiff
}

/** Changes between the shown audit and the one it is compared with. */
export function AuditComparison({ since, diff }: AuditComparisonProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">
        Cambios desde la auditoría del{' '}
        <time dateTime={since}>{formatAbsoluteDate(since)}</time>
      </h3>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <DeltaItem label="Nota" delta={diff.scoreDelta} />
        <DeltaItem label="SEO" delta={diff.seoDelta} />
        <DeltaItem label="IA" delta={diff.aiDelta} />
      </dl>
      {hasCheckChanges(diff) ? (
        <div className="flex flex-col gap-4">
          <ChangeList title="Mejorados" changes={diff.improved} />
          <ChangeList title="Empeorados" changes={diff.regressed} />
          <ChangeList title="Nuevos" changes={diff.added} />
          <ChangeList title="Eliminados" changes={diff.removed} />
        </div>
      ) : (
        <p className="text-zinc-700 dark:text-zinc-300">Sin cambios en los checks.</p>
      )}
    </div>
  )
}
