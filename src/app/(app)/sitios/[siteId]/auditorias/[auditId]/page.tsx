import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { ChangesSection } from '@/components/ai/changes-section'
import { PlanSection } from '@/components/ai/plan-section'
import { AuditComparison } from '@/components/audits/audit-comparison'
import { AuditScores } from '@/components/audits/audit-scores'
import { CheckList } from '@/components/audits/check-list'
import { CompareForm, type CompareOption } from '@/components/audits/compare-form'
import { DetailSkeleton } from '@/components/audits/detail-skeleton'
import { AuditSiteForm } from '@/components/sites/audit-site-form'
import { BackLink } from '@/components/ui/back-link'
import { madridDay, readAuditReports, remainingGenerations } from '@/lib/ai/reports'
import { diffAudits, type AuditDiff } from '@/lib/audit/diff'
import { resolveComparisonTarget } from '@/lib/audit/present'
import type { CheckResult } from '@/lib/audit/types'
import { formatAbsoluteDate, formatRelativeTime, siteDisplayName } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/types'
import { auditRouteParamsSchema, parseChecks, parseCompareParam } from '@/lib/validation/audit'

export const metadata: Metadata = {
  title: 'Auditoría · Faro',
}

// `auditSite` (re-audit) can take ~10 s per fetch; the AI actions wait up to 30 s for the model.
export const maxDuration = 60

const AUDIT_COLUMNS = 'id, site_id, status, score, seo_score, ai_score, checks, error, created_at'
const OPTION_COLUMNS = 'id, created_at, score'
const OPTIONS_LIMIT = 30

type AuditRow = Omit<Tables<'audits'>, 'user_id'>
type Supabase = Awaited<ReturnType<typeof createClient>>
type SearchParams = Record<string, string | string[] | undefined>
type AuditPageProps = {
  params: Promise<{ siteId: string; auditId: string }>
  searchParams: Promise<SearchParams>
}

type Comparison =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'ok'; since: string; targetId: string; diff: AuditDiff }

function logQueryError(scope: string, error: unknown): never {
  console.error(`[AuditPage] ${scope}`, error)
  throw new Error('No se pudo cargar la auditoría.')
}

async function loadAudit(rawParams: { siteId: string; auditId: string }) {
  const parsed = auditRouteParamsSchema.safeParse(rawParams)
  if (!parsed.success) notFound()
  const { siteId, auditId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [siteResult, auditResult] = await Promise.all([
    supabase.from('sites').select('id, url, name').eq('id', siteId).eq('user_id', user.id).maybeSingle(),
    supabase
      .from('audits')
      .select(AUDIT_COLUMNS)
      .eq('id', auditId)
      .eq('site_id', siteId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])
  if (siteResult.error) logQueryError('site', siteResult.error)
  if (auditResult.error) logQueryError('audit', auditResult.error)
  if (!siteResult.data || !auditResult.data) notFound()

  return { supabase, userId: user.id, site: siteResult.data, audit: auditResult.data satisfies AuditRow }
}

async function loadComparisonRows(supabase: Supabase, userId: string, audit: AuditRow, requestedId: string | null) {
  const okAudits = () =>
    supabase.from('audits').select(AUDIT_COLUMNS).eq('site_id', audit.site_id).eq('user_id', userId).eq('status', 'ok')

  const [requested, previous, options] = await Promise.all([
    requestedId ? okAudits().eq('id', requestedId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    okAudits().lt('created_at', audit.created_at).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from('audits')
      .select(OPTION_COLUMNS)
      .eq('site_id', audit.site_id)
      .eq('user_id', userId)
      .eq('status', 'ok')
      .neq('id', audit.id)
      .order('created_at', { ascending: false })
      .limit(OPTIONS_LIMIT),
  ])
  if (requested.error) logQueryError('requested', requested.error)
  if (previous.error) logQueryError('previous', previous.error)
  if (options.error) logQueryError('options', options.error)

  return { requested: requested.data, previous: previous.data, options: options.data satisfies CompareOption[] }
}

/** AI reports and today's usage. A failure here never hides the audit (D-AI-05). */
async function loadAiData(supabase: Supabase, userId: string, auditId: string) {
  const [reports, usage] = await Promise.all([
    supabase.from('ai_reports').select('kind, content, created_at').eq('audit_id', auditId).eq('user_id', userId),
    supabase.from('ai_usage').select('count').eq('user_id', userId).eq('day', madridDay(new Date())).maybeSingle(),
  ])
  if (reports.error) console.error('[AuditPage] ai_reports', reports.error)
  if (usage.error) console.error('[AuditPage] ai_usage', usage.error)
  return {
    loadError: Boolean(reports.error),
    reports: readAuditReports(reports.error ? [] : (reports.data ?? [])),
    remaining: usage.error ? null : remainingGenerations(usage.data?.count),
  }
}

function compare(audit: AuditRow, checks: CheckResult[], target: AuditRow | null): Comparison {
  if (!target) return { kind: 'none' }
  const targetChecks = parseChecks(target.checks)
  if (!targetChecks.ok) {
    console.error('[AuditPage] invalid checks in comparison', target.id, targetChecks.error)
    return { kind: 'invalid' }
  }
  const diff = diffAudits(
    { score: target.score, seoScore: target.seo_score, aiScore: target.ai_score, checks: targetChecks.checks },
    { score: audit.score, seoScore: audit.seo_score, aiScore: audit.ai_score, checks },
  )
  return { kind: 'ok', since: target.created_at, targetId: target.id, diff }
}

type ComparisonSectionProps = { comparison: Comparison; options: CompareOption[]; action: string; aiSummary: ReactNode }

function ComparisonSection({ comparison, options, action, aiSummary }: ComparisonSectionProps) {
  return (
    <section aria-labelledby="comparison-title" className="flex flex-col gap-4">
      <h2 id="comparison-title" className="text-xl font-semibold">
        Comparación
      </h2>
      {comparison.kind === 'ok' ? <AuditComparison since={comparison.since} diff={comparison.diff} /> : null}
      {comparison.kind === 'none' ? (
        <p className="text-zinc-700 dark:text-zinc-300">No hay una auditoría anterior con la que comparar.</p>
      ) : null}
      {comparison.kind === 'invalid' ? (
        <p role="alert" className="text-red-800 dark:text-red-300">
          No se pudo cargar la comparación. Prueba con otra auditoría.
        </p>
      ) : null}
      {aiSummary}
      <CompareForm
        action={action}
        options={options}
        selectedId={comparison.kind === 'ok' ? comparison.targetId : (options[0]?.id ?? '')}
      />
    </section>
  )
}

async function OkAuditBody({ supabase, userId, audit, compareParam, action }: {
  supabase: Supabase
  userId: string
  audit: AuditRow
  compareParam: string | string[] | undefined
  action: string
}) {
  const checks = parseChecks(audit.checks)
  if (!checks.ok) {
    console.error('[AuditPage] invalid checks', audit.id, checks.error)
    return (
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        No se pudieron mostrar los resultados de esta auditoría. Vuelve a auditar el sitio.
      </p>
    )
  }

  const requestedId = parseCompareParam(compareParam, audit.id)
  const [rows, ai] = await Promise.all([
    loadComparisonRows(supabase, userId, audit, requestedId),
    loadAiData(supabase, userId, audit.id),
  ])
  const target = resolveComparisonTarget(audit, rows.requested, rows.previous)
  const comparison = compare(audit, checks.checks, target?.audit ?? null)
  const previous = resolveComparisonTarget(audit, null, rows.previous)?.audit ?? null
  const aiSummary = previous ? (
    <ChangesSection
      siteId={audit.site_id}
      auditId={audit.id}
      report={ai.reports.changes}
      previousDate={previous.created_at}
      comparingOther={target !== null && target.audit.id !== previous.id}
      loadError={ai.loadError}
    />
  ) : null

  return (
    <>
      <PlanSection
        siteId={audit.site_id}
        auditId={audit.id}
        report={ai.reports.plan}
        checks={checks.checks}
        remaining={ai.remaining}
        loadError={ai.loadError}
      />
      <section aria-labelledby="checks-title" className="flex flex-col gap-4">
        <h2 id="checks-title" className="text-xl font-semibold">
          Comprobaciones
        </h2>
        <CheckList checks={checks.checks} />
      </section>
      <ComparisonSection comparison={comparison} options={rows.options} action={action} aiSummary={aiSummary} />
    </>
  )
}

async function AuditContent({ params, searchParams }: AuditPageProps) {
  const [rawParams, query] = await Promise.all([params, searchParams])
  const { supabase, userId, site, audit } = await loadAudit(rawParams)
  const displayName = siteDisplayName(site.name, site.url)
  const action = `/sitios/${site.id}/auditorias/${audit.id}`

  return (
    <>
      <BackLink href={`/sitios/${site.id}`}>Volver a {displayName}</BackLink>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight break-words">Auditoría de {displayName}</h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <time dateTime={audit.created_at}>{formatAbsoluteDate(audit.created_at)}</time> ·{' '}
          {formatRelativeTime(audit.created_at)}
        </p>
        <p className="text-sm break-all text-zinc-700 dark:text-zinc-300">{site.url}</p>
      </header>
      {audit.status === 'error' ? (
        <section className="flex flex-col items-start gap-4 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-red-800 dark:text-red-200">
            <span className="font-medium">
              <span aria-hidden="true">✕ </span>La auditoría falló:
            </span>{' '}
            {audit.error ?? 'Error desconocido.'}
          </p>
          <AuditSiteForm siteId={site.id} siteName={displayName} />
        </section>
      ) : (
        <>
          <AuditScores score={audit.score} seoScore={audit.seo_score} aiScore={audit.ai_score} size="lg" />
          <OkAuditBody supabase={supabase} userId={userId} audit={audit} compareParam={query.comparar} action={action} />
        </>
      )}
    </>
  )
}

export default function AuditPage(props: AuditPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <Suspense fallback={<DetailSkeleton label="Cargando la auditoría…" />}>
        <AuditContent {...props} />
      </Suspense>
    </main>
  )
}
