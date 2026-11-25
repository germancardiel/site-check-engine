import { checkAnchorId, groupChecks, type CheckGroup } from '@/lib/audit/present'
import type { CheckResult } from '@/lib/audit/types'
import { CheckStatusBadge } from './check-status-badge'
import { DetailsAnchorOpener } from './details-anchor-opener'

function CheckItem({ check }: { check: CheckResult }) {
  return (
    <li
      id={checkAnchorId(check.id)}
      className="flex scroll-mt-4 flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-medium break-words text-zinc-900 dark:text-zinc-100">{check.title}</h4>
        <CheckStatusBadge status={check.status} />
      </div>
      <p className="text-sm break-words text-zinc-700 dark:text-zinc-300">{check.message}</p>
      {check.status !== 'pass' ? (
        <p className="text-sm break-words text-zinc-900 dark:text-zinc-100">
          <span className="font-medium">Recomendación: </span>
          {check.recommendation}
        </p>
      ) : (
        <p className="text-sm break-words text-zinc-700 dark:text-zinc-300">{check.recommendation}</p>
      )}
    </li>
  )
}

function CheckSection({ group }: { group: CheckGroup }) {
  const headingId = `checks-${group.category}`
  const total = group.pending.length + group.passed.length

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-lg font-semibold">
        {group.title}
      </h3>
      {total === 0 ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">No hay comprobaciones en esta sección.</p>
      ) : null}
      {group.pending.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {group.pending.map((check) => (
            <CheckItem key={check.id} check={check} />
          ))}
        </ul>
      ) : null}
      {group.passed.length > 0 ? (
        <details>
          <summary className="cursor-pointer rounded-md text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-white">
            {group.passed.length === 1
              ? '1 comprobación superada'
              : `${group.passed.length} comprobaciones superadas`}
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {group.passed.map((check) => (
              <CheckItem key={check.id} check={check} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

/** Checks grouped into SEO and IA, sorted from `fail` to `pass`; passed ones are folded. */
export function CheckList({ checks }: { checks: CheckResult[] }) {
  return (
    <div className="flex flex-col gap-8">
      <DetailsAnchorOpener />
      {groupChecks(checks).map((group) => (
        <CheckSection key={group.category} group={group} />
      ))}
    </div>
  )
}
