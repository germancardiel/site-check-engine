import { CHECK_CATEGORY_LABEL, checkAnchorId, groupChecks, prioritizeChecks } from '@/lib/audit/present'
import type { CheckResult } from '@/lib/audit/types'
import { CheckStatusBadge } from './check-status-badge'
import { DetailsAnchorOpener } from './details-anchor-opener'

function CheckItem({ check, level }: { check: CheckResult; level: 3 | 4 }) {
  const pending = check.status !== 'pass'
  const Heading = level === 3 ? 'h3' : 'h4'
  return (
    <li
      id={checkAnchorId(check.id)}
      className="grid scroll-mt-4 gap-2 border-b border-line py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Heading className="font-semibold break-words text-ink">{check.title}</Heading>
          <span className="font-mono text-xs text-ink-muted">
            {check.id} · {CHECK_CATEGORY_LABEL[check.category]}
          </span>
        </div>
        <p className="text-sm break-words text-ink-muted">{check.message}</p>
        {pending ? (
          <p className="text-sm break-words text-ink">
            <span className="font-semibold">Recomendación: </span>
            {check.recommendation}
          </p>
        ) : null}
      </div>
      <CheckStatusBadge status={check.status} className="self-start justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end" />
    </li>
  )
}

function PassedChecks({ passed }: { passed: CheckResult[] }) {
  const groups = groupChecks(passed).filter((group) => group.passed.length > 0)
  return (
    <details className="group rounded-md border border-line">
      <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-4 py-3 text-sm font-semibold text-ink transition-colors duration-200 ease-out hover:bg-panel">
        <span>
          {passed.length === 1 ? '1 comprobación superada' : `${passed.length} comprobaciones superadas`}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 text-ink-muted transition-transform duration-200 ease-out group-open:rotate-180"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
      <div className="flex flex-col gap-6 px-4 pb-2">
        {groups.map((group) => (
          <section key={group.category} aria-labelledby={`passed-${group.category}`} className="flex flex-col">
            <h3 id={`passed-${group.category}`} className="pt-3 font-mono text-xs tracking-wider text-ink-muted uppercase">
              {group.title}
            </h3>
            <ul>
              {group.passed.map((check) => (
                <CheckItem key={check.id} check={check} level={4} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  )
}

/** "Qué arreglar primero": `fail` then `warn` across SEO and IA; the passed checks folded below. */
export function CheckList({ checks }: { checks: CheckResult[] }) {
  const { pending, passed } = prioritizeChecks(checks)

  return (
    <div className="flex flex-col gap-6">
      <DetailsAnchorOpener />
      {pending.length > 0 ? (
        <ul className="border-t border-line-strong">
          {pending.map((check) => (
            <CheckItem key={check.id} check={check} level={3} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-pass p-4 text-ink">
          Nada pendiente: todas las comprobaciones de esta auditoría están superadas.
        </p>
      )}
      {passed.length > 0 ? <PassedChecks passed={passed} /> : null}
    </div>
  )
}
