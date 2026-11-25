import type { StoredReport } from '@/lib/ai/reports'
import type { ChangeSummary as ChangeSummaryData } from '@/lib/ai/schemas'
import { formatAbsoluteDate } from '@/lib/format'
import { AiNotice } from './ai-notice'
import { ChangeSummary } from './change-summary'
import { GenerateReportForm } from './generate-report-form'

type ChangesSectionProps = {
  siteId: string
  auditId: string
  report: StoredReport<ChangeSummaryData>
  /** `created_at` of the previous `ok` audit, the one the summary is generated against. */
  previousDate: string
  /** Whether the comparison above uses `?comparar` with an audit other than the previous one. */
  comparingOther: boolean
  loadError: boolean
}

/** "Resumen de cambios con IA", always against the previous `ok` audit. */
export function ChangesSection({ siteId, auditId, report, previousDate, comparingOther, loadError }: ChangesSectionProps) {
  return (
    <section
      aria-labelledby="ai-changes-title"
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h3 id="ai-changes-title" className="text-lg font-semibold">
        Resumen de cambios con IA
      </h3>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Compara esta auditoría con la anterior, del{' '}
        <time dateTime={previousDate}>{formatAbsoluteDate(previousDate)}</time>.
        {comparingOther ? ' No usa la auditoría elegida en el selector de comparación.' : null}
      </p>
      {loadError ? <AiNotice>No se pudo cargar el resumen guardado. Puedes volver a generarlo.</AiNotice> : null}
      {report.status === 'invalid' ? (
        <AiNotice>No se pudo mostrar el resumen guardado. Regenéralo para verlo.</AiNotice>
      ) : null}
      {report.status === 'none' && !loadError ? (
        <p className="text-zinc-700 dark:text-zinc-300">Aún no hay un resumen de cambios generado.</p>
      ) : null}
      {report.status === 'ok' ? <ChangeSummary summary={report.data} /> : null}
      <GenerateReportForm kind="changes" siteId={siteId} auditId={auditId} hasReport={report.status !== 'none'} />
    </section>
  )
}
