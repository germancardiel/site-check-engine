import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { AuditHistory } from '@/components/audits/audit-history'
import { DetailSkeleton } from '@/components/audits/detail-skeleton'
import { ScoreChart } from '@/components/audits/score-chart'
import { AuditSiteForm } from '@/components/sites/audit-site-form'
import { BackLink } from '@/components/ui/back-link'
import { buildHistory, HISTORY_LIMIT, type HistoryAudit } from '@/lib/audit/history'
import { siteDisplayName } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { siteIdSchema } from '@/lib/validation/site'

export const metadata: Metadata = {
  title: 'Sitio · Faro',
}

// `auditSite` can take up to ~10 s per page fetch plus auxiliary files.
export const maxDuration = 60

const HISTORY_COLUMNS = 'id, status, score, seo_score, ai_score, error, created_at'

type SitePageProps = { params: Promise<{ siteId: string }> }

async function loadSite(siteId: string) {
  const parsed = siteIdSchema.safeParse({ id: siteId })
  if (!parsed.success) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: site, error } = await supabase
    .from('sites')
    .select('id, url, name')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('[SitePage] site', error)
    throw new Error('No se pudo cargar el sitio.')
  }
  if (!site) notFound()

  // One extra row so the oldest visible audit can still show its score change.
  const { data: audits, error: auditsError } = await supabase
    .from('audits')
    .select(HISTORY_COLUMNS)
    .eq('site_id', site.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT + 1)
  if (auditsError) {
    console.error('[SitePage] audits', auditsError)
    throw new Error('No se pudo cargar el historial.')
  }

  return { site, audits: audits satisfies HistoryAudit[] }
}

async function SiteContent({ params }: SitePageProps) {
  // Per-request render: the history shows times relative to now (D-QA-08).
  await connection()
  const { siteId } = await params
  const { site, audits } = await loadSite(siteId)
  const displayName = siteDisplayName(site.name, site.url)
  const history = buildHistory(audits)

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{displayName}</h1>
          <p className="text-sm break-all text-zinc-700 dark:text-zinc-300">{site.url}</p>
        </div>
        {history.length > 0 ? <AuditSiteForm siteId={site.id} siteName={displayName} /> : null}
      </header>

      {history.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
          <p className="text-zinc-700 dark:text-zinc-300">Este sitio aún no tiene auditorías.</p>
          <AuditSiteForm siteId={site.id} siteName={displayName} />
        </section>
      ) : (
        <>
          <section aria-labelledby="evolution-title" className="flex flex-col gap-4">
            <h2 id="evolution-title" className="text-lg font-semibold">
              Evolución
            </h2>
            <ScoreChart audits={history} />
          </section>
          <section aria-labelledby="history-title" className="flex flex-col gap-4">
            <h2 id="history-title" className="text-lg font-semibold">
              Historial
            </h2>
            <AuditHistory entries={history} siteId={site.id} now={new Date()} />
          </section>
        </>
      )}
    </>
  )
}

export default function SitePage({ params }: SitePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <BackLink href="/sitios">Volver a tus sitios</BackLink>
      <Suspense fallback={<DetailSkeleton label="Cargando el sitio…" />}>
        <SiteContent params={params} />
      </Suspense>
    </div>
  )
}
