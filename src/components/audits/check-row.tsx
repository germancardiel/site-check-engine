import { StatusIcon } from '@/components/ui/status-icon'
import { checkAnchorId, STATUS_LABEL } from '@/lib/audit/present'
import type { CheckResult, CheckStatus, DocLink, EvidenceItem } from '@/lib/audit/types'
import { cn } from '@/lib/utils'
import { ExternalLinkIcon } from './category-icons'
import { CheckStatusBadge } from './check-status-badge'

function itemBorder(status: EvidenceItem['status']): string {
  if (status === 'bad') return 'border-fail text-ink'
  if (status === 'ok') return 'border-pass text-ink'
  return 'border-line text-ink-muted'
}

/** Check status equivalent to an ok/bad evidence item (neutral items have none). */
const ITEM_STATUS: Partial<Record<NonNullable<EvidenceItem['status']>, CheckStatus>> = { ok: 'pass', bad: 'fail' }

/** Icon plus screen reader text, so an ok/bad item never depends on its border color alone. */
function ItemStatus({ status }: { status: EvidenceItem['status'] }) {
  const checkStatus = status ? ITEM_STATUS[status] : undefined
  if (!checkStatus) return null
  return (
    <>
      <StatusIcon status={checkStatus} className="mt-px size-3.5" />
      <span className="sr-only">{STATUS_LABEL[checkStatus]}: </span>
    </>
  )
}

function CheckItemsList({ items }: { items?: EvidenceItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <ul className="mt-2.5 flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <li
          key={`${i}-${it.label}`}
          className={cn(
            'inline-flex max-w-full items-start gap-1 break-words rounded-md border bg-ground px-2 py-1 text-xs',
            itemBorder(it.status),
          )}
        >
          <ItemStatus status={it.status} />
          <span>
            <span className="font-medium text-ink">{it.label}</span>
            {it.value ? <span className="text-ink-muted">: {it.value}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

function CheckDocsList({ docs }: { docs: DocLink[] }) {
  if (docs.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4">
      {docs.map((d) => (
        <a
          key={d.url}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1 rounded-sm text-xs text-ink-muted underline decoration-line-strong hover:text-ink hover:decoration-ink"
        >
          {d.label}
          <ExternalLinkIcon />
        </a>
      ))}
    </div>
  )
}

export function CheckRow({ check }: { check: CheckResult }) {
  const showFix = check.fix && (check.status === 'warn' || check.status === 'fail')
  return (
    <li id={checkAnchorId(check.id)} tabIndex={-1} className="scroll-mt-24 border-t border-line py-4 first:border-t-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h4 className="text-[15px] font-medium leading-snug break-words text-ink">{check.title}</h4>
        <CheckStatusBadge status={check.status} className="self-start" />
      </div>
      <p className="mt-1.5 text-sm leading-relaxed break-words text-ink-muted">{check.message}</p>
      {check.evidence ? (
        <p className="mt-2 break-words rounded-md border border-line bg-ground px-2.5 py-1.5 font-mono text-xs text-ink">
          {check.evidence}
        </p>
      ) : null}
      <CheckItemsList items={check.items} />
      {showFix ? (
        <div className="mt-3">
          <p className="mb-1 font-mono text-[11px] tracking-wider text-ink-muted uppercase">Cómo arreglarlo</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-line bg-ground px-3 py-2.5 font-mono text-xs leading-relaxed text-ink">
            {check.fix}
          </pre>
        </div>
      ) : null}
      <CheckDocsList docs={check.docs} />
    </li>
  )
}
