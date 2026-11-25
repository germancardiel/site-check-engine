import { formatRelativeTime, siteDisplayName } from '@/lib/format'
import type { AuditStatus } from '@/lib/supabase/types'
import { AuditSiteForm } from './audit-site-form'
import { DeleteSiteForm } from './delete-site-form'

export type LatestAudit = {
  status: AuditStatus
  score: number | null
  seo_score: number | null
  ai_score: number | null
  error: string | null
  created_at: string
}

export type SiteWithLatestAudit = {
  id: string
  url: string
  name: string | null
  latestAudit: LatestAudit | null
}

function AuditSummary({ audit, now }: { audit: LatestAudit | null; now: Date }) {
  if (!audit) return <p className="text-sm text-zinc-700 dark:text-zinc-300">Sin auditar</p>

  const when = (
    <time dateTime={audit.created_at} className="text-sm text-zinc-700 dark:text-zinc-300">
      {formatRelativeTime(audit.created_at, now)}
    </time>
  )

  if (audit.status === 'error') {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Error en la última auditoría
        </p>
        {audit.error ? <p className="text-sm text-zinc-700 dark:text-zinc-300">{audit.error}</p> : null}
        {when}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt className="text-zinc-700 dark:text-zinc-300">Nota</dt>
          <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{audit.score ?? '–'}/100</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-zinc-700 dark:text-zinc-300">SEO</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">{audit.seo_score ?? '–'}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-zinc-700 dark:text-zinc-300">IA</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">{audit.ai_score ?? '–'}</dd>
        </div>
      </dl>
      {when}
    </div>
  )
}

export function SiteCard({ site, now }: { site: SiteWithLatestAudit; now: Date }) {
  const displayName = siteDisplayName(site.name, site.url)

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-base font-semibold break-words text-zinc-900 dark:text-zinc-100">
          {displayName}
        </h3>
        <p className="text-sm break-all text-zinc-700 dark:text-zinc-300">{site.url}</p>
        <AuditSummary audit={site.latestAudit} now={now} />
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:max-w-64 sm:flex-col sm:items-stretch">
        <AuditSiteForm siteId={site.id} siteName={displayName} />
        <DeleteSiteForm siteId={site.id} siteName={displayName} />
      </div>
    </li>
  )
}
