import { ChevronIcon } from '@/components/ui/chevron-icon'
import type { ChangeSummary as ChangeSummaryData } from '@/lib/ai/schemas'

/** AI summary of the changes versus the previous audit. */
export function ChangeSummary({ summary }: { summary: ChangeSummaryData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="break-words text-ink">{summary.summary}</p>
      <ul className="flex flex-col gap-1.5 text-sm text-ink-muted">
        {summary.highlights.map((highlight, index) => (
          <li key={`${index}-${highlight}`} className="flex gap-2 break-words">
            <ChevronIcon className="mt-1 text-ink-muted" />
            <span className="min-w-0">{highlight}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
