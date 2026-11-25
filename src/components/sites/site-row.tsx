import Link from 'next/link'
import { StatusIcon } from '@/components/ui/status-icon'
import { ScoreMeter } from '@/components/ui/score-meter'
import { formatRelativeTime, siteDisplayName } from '@/lib/format'
import type { AuditStatus } from '@/lib/supabase/types'
import { AuditSiteForm } from './audit-site-form'
import { DeleteSiteForm } from './delete-site-form'

export type LatestAudit = {
  id: string
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

const LINK_CLASS = 'rounded-sm underline decoration-line-strong transition-colors duration-200 ease-out hover:decoration-ink'

function Scores({ audit }: { audit: LatestAudit | null }) {
  if (!audit) return <p className="text-sm text-ink-muted">Sin auditar. Pulsa Auditar para obtener su primera nota.</p>
  if (audit.status === 'error') {
    return (
      <div className="flex min-w-0 items-start gap-2 text-sm">
        <StatusIcon status="fail" className="mt-0.5" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-medium text-ink">Error en la última auditoría</p>
          {audit.error ? <p className="break-words text-ink-muted">{audit.error}</p> : null}
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ScoreMeter label="Nota" value={audit.score} tone="accent" />
      <dl className="flex gap-4 font-mono text-xs text-ink-muted tabular-nums">
        <div className="flex gap-1.5">
          <dt>SEO</dt>
          <dd className="text-ink">{audit.seo_score ?? '–'}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>IA</dt>
          <dd className="text-ink">{audit.ai_score ?? '–'}</dd>
        </div>
      </dl>
    </div>
  )
}

function LastAudit({ audit, siteId, now }: { audit: LatestAudit | null; siteId: string; now: Date }) {
  if (!audit) return <span aria-hidden="true" className="hidden font-mono text-xs text-ink-muted lg:inline">—</span>
  return (
    <div className="flex flex-col gap-1 text-sm">
      <time dateTime={audit.created_at} className="font-mono text-xs text-ink-muted">
        {formatRelativeTime(audit.created_at, now)}
      </time>
      <Link href={`/sitios/${siteId}/auditorias/${audit.id}`} className={`${LINK_CLASS} self-start text-ink`}>
        {audit.status === 'error' ? 'Ver el error' : 'Ver informe'}
        <span className="sr-only"> de la última auditoría</span>
      </Link>
    </div>
  )
}

/** One site of the list: name and URL, latest scores, when it was audited and its actions. */
export function SiteRow({ site, now }: { site: SiteWithLatestAudit; now: Date }) {
  const displayName = siteDisplayName(site.name, site.url)

  return (
    <li className="grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7.5rem_12rem] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-base font-semibold break-words text-ink">
          <Link href={`/sitios/${site.id}`} className={LINK_CLASS}>
            {displayName}
          </Link>
        </h3>
        <p className="font-mono text-xs break-all text-ink-muted">{site.url}</p>
      </div>
      <Scores audit={site.latestAudit} />
      <LastAudit audit={site.latestAudit} siteId={site.id} now={now} />
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <AuditSiteForm siteId={site.id} siteName={displayName} />
        <DeleteSiteForm siteId={site.id} siteName={displayName} />
      </div>
    </li>
  )
}
