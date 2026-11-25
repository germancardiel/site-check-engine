import type { AuditDiff, CheckChange } from '@/lib/audit/diff'
import { CHECK_CATEGORY_LABEL, hasCheckChanges } from '@/lib/audit/present'
import { formatAbsoluteDate } from '@/lib/format'
import { CheckStatusBadge } from './check-status-badge'
import { ScoreDelta } from './score-delta'

function DeltaItem({ label, delta }: { label: string; delta: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd>{delta === null ? <span className="font-mono text-sm">–</span> : <ScoreDelta delta={delta} />}</dd>
    </div>
  )
}

type ChangeListProps = { title: string; changes: CheckChange[] }

function ChangeList({ title, changes }: ChangeListProps) {
  if (changes.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h4 className="flex items-baseline gap-2 font-semibold text-ink">
        {title}{' '}
        <span className="font-mono text-sm font-normal text-ink-muted tabular-nums">({changes.length})</span>
      </h4>
      <ul className="border-t border-line">
        {changes.map((change) => (
          <li
            key={change.id}
            className="flex flex-col gap-2 border-b border-line py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm break-words text-ink">
              {change.title} <span className="text-ink-muted">({CHECK_CATEGORY_LABEL[change.category]})</span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              {change.from ? <CheckStatusBadge status={change.from} /> : <span>No existía</span>}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />
              </svg>
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
        <time dateTime={since} className="font-mono text-base font-medium">
          {formatAbsoluteDate(since)}
        </time>
      </h3>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <DeltaItem label="Nota" delta={diff.scoreDelta} />
        <DeltaItem label="SEO" delta={diff.seoDelta} />
        <DeltaItem label="IA" delta={diff.aiDelta} />
      </dl>
      {hasCheckChanges(diff) ? (
        <div className="flex flex-col gap-5">
          <ChangeList title="Mejorados" changes={diff.improved} />
          <ChangeList title="Empeorados" changes={diff.regressed} />
          <ChangeList title="Nuevos" changes={diff.added} />
          <ChangeList title="Eliminados" changes={diff.removed} />
        </div>
      ) : (
        <p className="text-ink-muted">Sin cambios en los checks.</p>
      )}
    </div>
  )
}
