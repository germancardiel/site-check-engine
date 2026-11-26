import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import { AuditHistory } from '@/components/audits/audit-history'
import { DetailSkeleton } from '@/components/audits/detail-skeleton'
import { ScoreChart } from '@/components/audits/score-chart'
import { AuditSiteForm } from '@/components/sites/audit-site-form'
import { BackLink } from '@/components/ui/back-link'
import { buildHistory, HISTORY_LIMIT, type HistoryAudit } from '@/lib/audit/history'
import { siteDisplayName } from '@/lib/format'
import { SITE_NAME } from '@/lib/site'
import { auditCooldown } from '@/lib/sites/audit-availability'
import { loadRemainingAudits } from '@/lib/sites/audit-usage'
import { createClient } from '@/lib/supabase/server'
import { siteIdSchema } from '@/lib/validation/site'

export const metadata: Metadata = {
  title: `Sitio · ${SITE_NAME}`,
}

// `auditSite` can take up to ~10 s per page fetch plus auxiliary files.
export const maxDuration = 60

const HISTORY_COLUMNS = 'id, status, score, seo_score, ai_score, error, created_at'

type SitePageProps = { params: Promise<{ siteId: string }> }

async function loadSite(siteId: string, now: Date) {
  const parsed = siteIdSchema.safeParse({ id: siteId })
  if (!parsed.success) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: site, error } = await supabase
    .from('sites')
    .select('id, url, name, last_audit_started_at')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('[SitePage] site', error)
    throw new Error('No se pudo cargar el sitio.')
  }
  if (!site) notFound()

  // One extra row so the oldest visible audit can still show its score change.
  const [{ data: audits, error: auditsError }, remainingAudits] = await Promise.all([
    supabase
      .from('audits')
      .select(HISTORY_COLUMNS)
      .eq('site_id', site.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT + 1),
    loadRemainingAudits(supabase, user.id, now),
  ])
  if (auditsError) {
    console.error('[SitePage] audits', auditsError)
    throw new Error('No se pudo cargar el historial.')
  }

  return { site, audits: audits satisfies HistoryAudit[], remainingAudits }
}

/** Empty state of a new site: the first audit is one click away. */
function NoAuditsYet({ auditForm }: { auditForm: ReactNode }) {
  return (
    <section aria-labelledby="no-audits-title" className="flex flex-col items-start gap-3 rounded-md border border-line p-6 sm:p-8">
      <h2 id="no-audits-title" className="text-lg font-semibold">
        Este sitio aún no tiene auditorías.
      </h2>
      <p className="max-w-prose text-ink-muted">
        Lanza la primera: en unos segundos tendrás la nota de SEO, la de IA y la lista de lo que hay que arreglar.
      </p>
      {auditForm}
    </section>
  )
}

async function SiteContent({ params }: SitePageProps) {
  // Per-request render: the history shows times relative to now (D-QA-08).
  await connection()
  const now = new Date()
  const { siteId } = await params
  const { site, audits, remainingAudits } = await loadSite(siteId, now)
  const displayName = siteDisplayName(site.name, site.url)
  const history = buildHistory(audits)
  // What limits the audit button: the 1-minute wait of the site and the audits left today (D-UX-11).
  const auditForm = (label: string) => (
    <AuditSiteForm
      siteId={site.id}
      siteName={displayName}
      label={label}
      variant="primary"
      cooldown={auditCooldown(site.last_audit_started_at, now)}
      remaining={remainingAudits}
    />
  )

  return (
    <>
      <header className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold tracking-display break-words sm:text-5xl">{displayName}</h1>
          <p className="font-mono text-sm break-all text-ink-muted">{site.url}</p>
        </div>
        {history.length > 0 ? auditForm('Volver a auditar') : null}
      </header>

      {history.length === 0 ? (
        <NoAuditsYet auditForm={auditForm('Auditar ahora')} />
      ) : (
        <>
          <section aria-labelledby="evolution-title" className="flex flex-col gap-4">
            <h2 id="evolution-title" className="text-xl font-semibold">
              Evolución
            </h2>
            <ScoreChart audits={history} />
          </section>
          <section aria-labelledby="history-title" className="flex flex-col gap-4">
            <h2 id="history-title" className="flex items-baseline gap-3 text-xl font-semibold">
              Historial{' '}
              <span className="font-mono text-sm font-normal text-ink-muted tabular-nums">{history.length}</span>
            </h2>
            <AuditHistory entries={history} siteId={site.id} now={now} />
          </section>
        </>
      )}
    </>
  )
}

export default function SitePage({ params }: SitePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <BackLink href="/sitios">Volver a tus sitios</BackLink>
      <Suspense fallback={<DetailSkeleton variant="site" label="Cargando el sitio…" />}>
        <SiteContent params={params} />
      </Suspense>
    </div>
  )
}
