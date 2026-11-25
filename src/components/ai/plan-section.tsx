import type { CheckResult } from '@/lib/audit/types'
import { quotaLabel, type StoredReport } from '@/lib/ai/reports'
import type { ActionPlan as ActionPlanData } from '@/lib/ai/schemas'
import { formatAbsoluteDate } from '@/lib/format'
import { ActionPlan } from './action-plan'
import { AiNotice } from './ai-notice'
import { DownloadPlanButton } from './download-plan-button'
import { GenerateReportForm } from './generate-report-form'

/** Daily quota sentence in the UI font, with only the figure in mono. */
function QuotaNote({ label }: { label: string }) {
  return (
    <p className="text-sm text-ink-muted">
      {label.split(/(\d+)/).map((part, index) =>
        /^\d+$/.test(part) ? (
          <span key={index} className="font-mono text-ink tabular-nums">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  )
}

type PlanSectionProps = {
  siteId: string
  auditId: string
  report: StoredReport<ActionPlanData>
  checks: CheckResult[]
  /** URL of the audited site and global score of the audit, for the downloadable Markdown. */
  siteUrl: string
  score: number | null
  /** Generations left today; `null` when the counter could not be read. */
  remaining: number | null
  loadError: boolean
}

/** "Plan de acción" section of an `ok` audit: stored plan (if any) and the generate button. */
export function PlanSection(props: PlanSectionProps) {
  const { siteId, auditId, report, checks, siteUrl, score, remaining, loadError } = props
  return (
    <section aria-labelledby="plan-title" className="flex flex-col gap-5 border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="plan-title" className="text-2xl font-semibold">
          Plan de acción
        </h2>
        {remaining !== null ? <QuotaNote label={quotaLabel(remaining)} /> : null}
      </div>
      {loadError ? <AiNotice>No se pudieron cargar los informes de IA. Puedes volver a generarlos.</AiNotice> : null}
      {report.status === 'invalid' ? (
        <AiNotice>No se pudo mostrar el plan guardado. Regenéralo para verlo.</AiNotice>
      ) : null}
      {report.status === 'none' && !loadError ? (
        <p className="max-w-prose text-ink-muted">
          Aún no hay un plan de acción para esta auditoría. Genéralo con IA a partir de los checks pendientes.
        </p>
      ) : null}
      {report.status === 'ok' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              Generado con IA el{' '}
              <time dateTime={report.createdAt} className="font-mono text-ink">
                {formatAbsoluteDate(report.createdAt)}
              </time>
              .
            </p>
            <DownloadPlanButton
              plan={report.data}
              siteUrl={siteUrl}
              createdAt={report.createdAt}
              score={score}
              checks={checks.map(({ id, title }) => ({ id, title }))}
            />
          </div>
          <ActionPlan plan={report.data} checks={checks} />
        </>
      ) : null}
      <GenerateReportForm kind="plan" siteId={siteId} auditId={auditId} hasReport={report.status !== 'none'} />
    </section>
  )
}
