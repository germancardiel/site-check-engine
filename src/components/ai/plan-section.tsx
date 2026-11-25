import type { CheckResult } from '@/lib/audit/types'
import { quotaLabel, type StoredReport } from '@/lib/ai/reports'
import type { ActionPlan as ActionPlanData } from '@/lib/ai/schemas'
import { formatAbsoluteDate } from '@/lib/format'
import { ActionPlan } from './action-plan'
import { AiNotice } from './ai-notice'
import { GenerateReportForm } from './generate-report-form'

type PlanSectionProps = {
  siteId: string
  auditId: string
  report: StoredReport<ActionPlanData>
  checks: CheckResult[]
  /** Generations left today; `null` when the counter could not be read. */
  remaining: number | null
  loadError: boolean
}

/** "Plan de acción" section of an `ok` audit: stored plan (if any) and the generate button. */
export function PlanSection({ siteId, auditId, report, checks, remaining, loadError }: PlanSectionProps) {
  return (
    <section aria-labelledby="plan-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="plan-title" className="text-xl font-semibold">
          Plan de acción
        </h2>
        {remaining !== null ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{quotaLabel(remaining)}</p>
        ) : null}
      </div>
      {loadError ? <AiNotice>No se pudieron cargar los informes de IA. Puedes volver a generarlos.</AiNotice> : null}
      {report.status === 'invalid' ? (
        <AiNotice>No se pudo mostrar el plan guardado. Regenéralo para verlo.</AiNotice>
      ) : null}
      {report.status === 'none' && !loadError ? (
        <p className="text-zinc-700 dark:text-zinc-300">
          Aún no hay un plan de acción para esta auditoría. Genéralo con IA a partir de los checks pendientes.
        </p>
      ) : null}
      {report.status === 'ok' ? (
        <>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Generado con IA el <time dateTime={report.createdAt}>{formatAbsoluteDate(report.createdAt)}</time>.
          </p>
          <ActionPlan plan={report.data} checks={checks} />
        </>
      ) : null}
      <GenerateReportForm kind="plan" siteId={siteId} auditId={auditId} hasReport={report.status !== 'none'} />
    </section>
  )
}
