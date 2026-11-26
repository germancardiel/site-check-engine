import { REPORT_SECTION_IDS } from './report-anchors'

export type ReportIndexLink = { href: string; label: string }

/**
 * Links of the report index. "Aspectos" goes to the list of issues when there are any and to
 * the detail by category otherwise, so every link points to a section that exists.
 */
export function reportIndexLinks(hasIssues: boolean): ReportIndexLink[] {
  return [
    { href: `#${REPORT_SECTION_IDS.summary}`, label: 'Resumen' },
    { href: `#${hasIssues ? REPORT_SECTION_IDS.issues : REPORT_SECTION_IDS.details}`, label: 'Aspectos' },
    { href: `#${REPORT_SECTION_IDS.plan}`, label: 'Plan de acción' },
    { href: `#${REPORT_SECTION_IDS.comparison}`, label: 'Comparación' },
  ]
}

/** Index of the audit detail: plain in-page links (the report view focuses the destination). */
export function ReportIndex({ hasIssues }: { hasIssues: boolean }) {
  return (
    <nav aria-label="Índice del informe">
      <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {reportIndexLinks(hasIssues).map((link, index) => (
          <li key={link.href} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" className="text-ink-muted">
                ·
              </span>
            ) : null}
            <a
              href={link.href}
              className="inline-flex min-h-10 items-center rounded-sm px-1 font-medium text-ink-muted underline decoration-line-strong transition-colors duration-200 ease-out hover:text-ink hover:decoration-ink"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
