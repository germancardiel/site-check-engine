import { checkAnchorId } from '@/lib/audit/present'
import type { CheckResult } from '@/lib/audit/types'
import { EFFORT_LABEL, IMPACT_LABEL, resolveCheckLinks } from '@/lib/ai/reports'
import type { ActionPlan as ActionPlanData, PlanAction } from '@/lib/ai/schemas'

const IMPACT_BORDER = { alto: 'border-fail', medio: 'border-warn', bajo: 'border-line-strong' }

const TAG = 'rounded-full border px-2.5 py-0.5 text-xs font-medium text-ink'

function ActionItem({ action, checks, index }: { action: PlanAction; checks: CheckResult[]; index: number }) {
  const links = resolveCheckLinks(action.checkIds, checks)
  return (
    <li className="grid gap-x-5 gap-y-2 border-b border-line py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
      <span aria-hidden="true" className="font-mono text-sm text-ink-muted tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold break-words text-ink">{action.title}</h3>
          <span className="flex flex-wrap gap-2">
            <span className={`${TAG} ${IMPACT_BORDER[action.impact]}`}>{IMPACT_LABEL[action.impact]}</span>
            <span className={`${TAG} border-line-strong`}>{EFFORT_LABEL[action.effort]}</span>
          </span>
        </div>
        <p className="text-sm break-words text-ink-muted">
          <span className="font-semibold text-ink">Por qué: </span>
          {action.why}
        </p>
        <p className="text-sm break-words text-ink-muted">
          <span className="font-semibold text-ink">Cómo: </span>
          {action.how}
        </p>
        {links.length > 0 ? (
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span>Comprobaciones relacionadas:</span>
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${checkAnchorId(link.id)}`}
                className="rounded-sm break-words text-ink underline decoration-line-strong hover:decoration-ink"
              >
                {link.title}
              </a>
            ))}
          </p>
        ) : null}
      </div>
    </li>
  )
}

/** AI action plan: summary and actions (already sorted by impact and effort). */
export function ActionPlan({ plan, checks }: { plan: ActionPlanData; checks: CheckResult[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose break-words text-ink">{plan.summary}</p>
      <ol className="border-t border-line-strong">
        {plan.actions.map((action, index) => (
          <ActionItem key={`${index}-${action.title}`} action={action} checks={checks} index={index} />
        ))}
      </ol>
    </div>
  )
}
