import type { ReactNode } from 'react'
import { ScoreMeter } from '@/components/ui/score-meter'
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/format'

type AuditSummaryProps = {
  score: number | null
  seoScore: number | null
  aiScore: number | null
  createdAt: string
  now: Date
  /** "Volver a auditar" form. */
  action: ReactNode
}

/** Summary band of an audit: the three scores as linear meters, the date and the next action. */
export function AuditSummary({ score, seoScore, aiScore, createdAt, now, action }: AuditSummaryProps) {
  return (
    <section aria-labelledby="summary-title" className="rounded-md border border-line bg-panel">
      <h2 id="summary-title" className="sr-only">
        Resumen de notas
      </h2>
      <div className="grid gap-6 p-5 sm:grid-cols-3 sm:gap-8 sm:p-6">
        <ScoreMeter label="Nota total" value={score} tone="accent" size="lg" />
        <ScoreMeter label="SEO" value={seoScore} size="lg" />
        <ScoreMeter label="IA" value={aiScore} size="lg" />
      </div>
      <div className="flex flex-col gap-4 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <p className="text-sm text-ink-muted">
          Auditada el{' '}
          <time dateTime={createdAt} className="font-mono text-ink tabular-nums">
            {formatAbsoluteDate(createdAt)}
          </time>{' '}
          · {formatRelativeTime(createdAt, now)}
        </p>
        {action}
      </div>
    </section>
  )
}
