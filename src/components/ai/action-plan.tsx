import { checkAnchorId } from '@/lib/audit/present'
import type { CheckResult } from '@/lib/audit/types'
import { EFFORT_LABEL, IMPACT_LABEL, resolveCheckLinks } from '@/lib/ai/reports'
import type { ActionPlan as ActionPlanData, PlanAction } from '@/lib/ai/schemas'

const IMPACT_STYLE = {
  alto: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  medio: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  bajo: 'border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200',
}

const TAG = 'rounded-full border px-2 py-0.5 text-xs font-medium'

function ActionItem({ action, checks }: { action: PlanAction; checks: CheckResult[] }) {
  const links = resolveCheckLinks(action.checkIds, checks)
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium break-words text-zinc-900 dark:text-zinc-100">{action.title}</h3>
        <span className="flex flex-wrap gap-2">
          <span className={`${TAG} ${IMPACT_STYLE[action.impact]}`}>{IMPACT_LABEL[action.impact]}</span>
          <span className={`${TAG} border-zinc-300 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200`}>
            {EFFORT_LABEL[action.effort]}
          </span>
        </span>
      </div>
      <p className="text-sm break-words text-zinc-700 dark:text-zinc-300">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Por qué: </span>
        {action.why}
      </p>
      <p className="text-sm break-words text-zinc-700 dark:text-zinc-300">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Cómo: </span>
        {action.how}
      </p>
      {links.length > 0 ? (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <span>Checks relacionados:</span>
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${checkAnchorId(link.id)}`}
              className="rounded-sm break-words text-zinc-900 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-white"
            >
              {link.title}
            </a>
          ))}
        </p>
      ) : null}
    </li>
  )
}

/** AI action plan: summary and actions (already sorted by impact and effort). */
export function ActionPlan({ plan, checks }: { plan: ActionPlanData; checks: CheckResult[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="break-words text-zinc-900 dark:text-zinc-100">{plan.summary}</p>
      <ol className="flex flex-col gap-3">
        {plan.actions.map((action, index) => (
          <ActionItem key={`${index}-${action.title}`} action={action} checks={checks} />
        ))}
      </ol>
    </div>
  )
}
