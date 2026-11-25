import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AddSiteForm } from '@/components/sites/add-site-form'
import type { SiteWithLatestAudit } from '@/components/sites/site-card'
import { SiteList } from '@/components/sites/site-list'
import { SitesSkeleton } from '@/components/sites/sites-skeleton'
import { SubmitButton } from '@/components/ui/submit-button'
import { createClient } from '@/lib/supabase/server'
import { logout } from './actions'

export const metadata: Metadata = {
  title: 'Sitios · Faro',
}

// `auditSite` can take up to ~10 s per page fetch plus auxiliary files.
export const maxDuration = 60

const SITE_COLUMNS = 'id, url, name, created_at'
const AUDIT_COLUMNS = 'status, score, seo_score, ai_score, error, created_at'

async function SitesContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // One request: each site embeds only its latest audit (no N+1).
  const { data, error } = await supabase
    .from('sites')
    .select(`${SITE_COLUMNS}, audits(${AUDIT_COLUMNS})`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'audits', ascending: false })
    .limit(1, { referencedTable: 'audits' })
  if (error) {
    console.error('[SitesPage]', error)
    throw new Error('No se pudieron cargar los sitios.')
  }

  const sites: SiteWithLatestAudit[] = data.map((site) => ({
    id: site.id,
    url: site.url,
    name: site.name,
    latestAudit: site.audits[0] ?? null,
  }))

  return (
    <>
      <p className="text-zinc-700 dark:text-zinc-300">
        Has iniciado sesión como{' '}
        <span className="font-medium break-all text-zinc-900 dark:text-zinc-100">{user.email}</span>
      </p>
      <AddSiteForm />
      <section aria-labelledby="site-list-title" className="flex flex-col gap-4">
        <h2 id="site-list-title" className="text-lg font-semibold">
          Sitios añadidos
        </h2>
        <SiteList sites={sites} now={new Date()} />
      </section>
    </>
  )
}

export default function SitesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tus sitios</h1>
        <form action={logout}>
          <SubmitButton variant="secondary" pendingLabel="Cerrando sesión…">
            Cerrar sesión
          </SubmitButton>
        </form>
      </div>
      <Suspense fallback={<SitesSkeleton />}>
        <SitesContent />
      </Suspense>
    </main>
  )
}
