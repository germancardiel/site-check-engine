import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { AddSiteForm } from '@/components/sites/add-site-form'
import type { SiteWithLatestAudit } from '@/components/sites/site-row'
import { SiteList } from '@/components/sites/site-list'
import { SitesSkeleton } from '@/components/sites/sites-skeleton'
import { SITE_NAME } from '@/lib/site'
import { auditCooldown } from '@/lib/sites/audit-availability'
import { loadRemainingAudits } from '@/lib/sites/audit-usage'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: `Sitios · ${SITE_NAME}`,
}

// `auditSite` can take up to ~10 s per page fetch plus auxiliary files.
export const maxDuration = 60

const SITE_COLUMNS = 'id, url, name, created_at, last_audit_started_at'
const AUDIT_COLUMNS = 'id, status, score, seo_score, ai_score, error, created_at'

async function SitesContent() {
  // Per-request render: the list shows times relative to now (D-QA-08).
  await connection()
  const now = new Date()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // One request: each site embeds only its latest audit (no N+1).
  const [{ data, error }, remainingAudits] = await Promise.all([
    supabase
      .from('sites')
      .select(`${SITE_COLUMNS}, audits(${AUDIT_COLUMNS})`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'audits', ascending: false })
      .limit(1, { referencedTable: 'audits' }),
    loadRemainingAudits(supabase, user.id, now),
  ])
  if (error) {
    console.error('[SitesPage]', error)
    throw new Error('No se pudieron cargar los sitios.')
  }

  const sites: SiteWithLatestAudit[] = data.map((site) => ({
    id: site.id,
    url: site.url,
    name: site.name,
    latestAudit: site.audits[0] ?? null,
    cooldown: auditCooldown(site.last_audit_started_at, now),
  }))

  return (
    <>
      <AddSiteForm />
      <section aria-labelledby="site-list-title" className="flex flex-col gap-4">
        {/* tabIndex -1: the focus lands here after deleting a site (D-UX-10). */}
        <h2 id="site-list-title" tabIndex={-1} className="flex items-baseline gap-3 text-base font-semibold">
          Sitios añadidos{' '}
          <span className="font-mono text-sm font-normal text-ink-muted tabular-nums">{sites.length}</span>
        </h2>
        <SiteList sites={sites} now={now} remainingAudits={remainingAudits} />
      </section>
    </>
  )
}

export default function SitesPage() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-4xl font-semibold tracking-display sm:text-5xl">Tus sitios</h1>
      <Suspense fallback={<SitesSkeleton />}>
        <SitesContent />
      </Suspense>
    </div>
  )
}
