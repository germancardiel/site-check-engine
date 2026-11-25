import type { ChangeSummary as ChangeSummaryData } from '@/lib/ai/schemas'

/** AI summary of the changes versus the previous audit. */
export function ChangeSummary({ summary }: { summary: ChangeSummaryData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="break-words text-zinc-900 dark:text-zinc-100">{summary.summary}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.highlights.map((highlight, index) => (
          <li key={`${index}-${highlight}`} className="break-words">
            {highlight}
          </li>
        ))}
      </ul>
    </div>
  )
}
