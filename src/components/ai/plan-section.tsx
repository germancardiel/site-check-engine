import type { CheckResult } from '@/lib/audit/types'
import type { StoredReport } from '@/lib/ai/reports'
import type { ActionPlan as ActionPlanData } from '@/lib/ai/schemas'
import { REPORT_SECTION_IDS } from '@/components/audits/report-anchors'
import { formatAbsoluteDate } from '@/lib/format'
import { ActionPlan } from './action-plan'
import { AiNotice } from './ai-notice'
import { DownloadPlanButton } from './download-plan-button'
import { GenerateReportForm } from './generate-report-form'

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
    <section
      id={REPORT_SECTION_IDS.plan}
      tabIndex={-1}
      aria-labelledby="plan-title"
      className="flex scroll-mt-24 flex-col gap-5 border-t border-line pt-10"
    >
      {/* tabIndex -1: the focus lands here after generating the plan (D-UX-10). */}
      <h2 id="plan-title" tabIndex={-1} className="text-2xl font-semibold">
        Plan de acción
      </h2>
      {loadError ? <AiNotice>No se pudieron cargar los informes de IA. Puedes volver a generarlos.</AiNotice> : null}
      {report.status === 'invalid' ? (
        <AiNotice>No se pudo mostrar el plan guardado. Regenéralo para verlo.</AiNotice>
      ) : null}
      {report.status === 'none' && !loadError ? (
        <p className="max-w-prose text-ink-muted">
          Aún no hay un plan de acción para esta auditoría. Genéralo con IA a partir de las comprobaciones pendientes.
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
      <GenerateReportForm
        kind="plan"
        siteId={siteId}
        auditId={auditId}
        hasReport={report.status !== 'none'}
        remaining={remaining}
      />
    </section>
  )
}
