import type { ReactNode } from 'react'
import { StatusIcon } from '@/components/ui/status-icon'
import type { AuditDiff } from '@/lib/audit/diff'
import { AuditComparison } from './audit-comparison'
import { CompareForm, type CompareOption } from './compare-form'
import { REPORT_SECTION_IDS } from './report-anchors'

export type Comparison =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'ok'; since: string; targetId: string; diff: AuditDiff }

type ComparisonSectionProps = { comparison: Comparison; options: CompareOption[]; action: string; aiSummary: ReactNode }

/** "Comparación" section of an audit: the diff, the AI summary and the selector of another audit. */
export function ComparisonSection({ comparison, options, action, aiSummary }: ComparisonSectionProps) {
  return (
    <section
      id={REPORT_SECTION_IDS.comparison}
      tabIndex={-1}
      aria-labelledby="comparison-title"
      className="flex scroll-mt-24 flex-col gap-5 border-t border-line pt-10"
    >
      <h2 id="comparison-title" className="text-2xl font-semibold">
        Comparación
      </h2>
      {comparison.kind === 'ok' ? <AuditComparison since={comparison.since} diff={comparison.diff} /> : null}
      {comparison.kind === 'none' ? (
        <p className="text-ink-muted">No hay una auditoría anterior con la que comparar.</p>
      ) : null}
      {comparison.kind === 'invalid' ? (
        <p role="alert" className="flex items-start gap-2 text-ink">
          <StatusIcon status="fail" className="mt-1" />
          No se pudo cargar la comparación. Prueba con otra auditoría.
        </p>
      ) : null}
      {aiSummary}
      <CompareForm
        action={action}
        options={options}
        selectedId={comparison.kind === 'ok' ? comparison.targetId : (options[0]?.id ?? '')}
      />
    </section>
  )
}
