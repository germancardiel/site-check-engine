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
  /** Generations left today; `null` when the counter could not be read. */
  remaining: number | null
  loadError: boolean
}

/** "Resumen de cambios con IA", always against the previous `ok` audit. */
export function ChangesSection(props: ChangesSectionProps) {
  const { siteId, auditId, report, previousDate, comparingOther, remaining, loadError } = props
  return (
    <section
      aria-labelledby="ai-changes-title"
      className="flex flex-col gap-3 rounded-md border border-line bg-panel p-5"
    >
      {/* tabIndex -1: the focus lands here after generating the summary (D-UX-10). */}
      <h3 id="ai-changes-title" tabIndex={-1} className="text-lg font-semibold">
        Resumen de cambios con IA
      </h3>
      <p className="text-sm text-ink-muted">
        Compara esta auditoría con la anterior, del{' '}
        <time dateTime={previousDate} className="font-mono text-ink">
          {formatAbsoluteDate(previousDate)}
        </time>
        .
        {comparingOther ? ' No usa la auditoría elegida en el selector de comparación.' : null}
      </p>
      {loadError ? <AiNotice>No se pudo cargar el resumen guardado. Puedes volver a generarlo.</AiNotice> : null}
      {report.status === 'invalid' ? (
        <AiNotice>No se pudo mostrar el resumen guardado. Regenéralo para verlo.</AiNotice>
      ) : null}
      {report.status === 'none' && !loadError ? (
        <p className="text-ink-muted">Aún no hay un resumen de cambios generado.</p>
      ) : null}
      {report.status === 'ok' ? <ChangeSummary summary={report.data} /> : null}
      <GenerateReportForm
        kind="changes"
        siteId={siteId}
        auditId={auditId}
        hasReport={report.status !== 'none'}
        remaining={remaining}
      />
    </section>
  )
}
