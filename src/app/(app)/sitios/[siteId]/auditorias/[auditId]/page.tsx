import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import { ChangesSection } from '@/components/ai/changes-section'
import { PlanSection } from '@/components/ai/plan-section'
import type { CompareOption } from '@/components/audits/compare-form'
import { ComparisonSection, type Comparison } from '@/components/audits/comparison-section'
import { DetailSkeleton } from '@/components/audits/detail-skeleton'
import { ReportIndex } from '@/components/audits/report-index'
import { ReportView } from '@/components/audits/report-view'
import { AuditSiteForm } from '@/components/sites/audit-site-form'
import { BackLink } from '@/components/ui/back-link'
import { StatusIcon } from '@/components/ui/status-icon'
import { madridDay, readAuditReports, remainingGenerations } from '@/lib/ai/reports'
import { diffAudits } from '@/lib/audit/diff'
import { buildAuditReport, resolveComparisonTarget } from '@/lib/audit/present'
import type { CheckResult } from '@/lib/audit/types'
import { formatAbsoluteDate, formatRelativeTime, siteDisplayName } from '@/lib/format'
import { auditPageTitle } from '@/lib/page-titles'
import { loadAuditTitleData } from '@/lib/sites/title-data'
import { auditCooldown } from '@/lib/sites/audit-availability'
import { loadRemainingAudits } from '@/lib/sites/audit-usage'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/types'
import { auditRouteParamsSchema, parseChecks, parseCompareParam } from '@/lib/validation/audit'

// `auditSite` (re-audit) can take ~10 s per fetch; the AI actions wait up to `AI_TIMEOUT_MS` (120 s)
// for the model, so 150 s leaves room for the quota refund after a timeout.
export const maxDuration = 150

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

export async function generateMetadata({ params }: Pick<AuditPageProps, 'params'>): Promise<Metadata> {
  const { name, createdAt } = await loadAuditTitleData(await params)
  return { title: auditPageTitle(name, createdAt) }
}

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
    supabase
      .from('sites')
      .select('id, url, name, last_audit_started_at')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .maybeSingle(),
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
async function loadAiData(supabase: Supabase, userId: string, auditId: string, now: Date) {
  const [reports, usage] = await Promise.all([
    supabase.from('ai_reports').select('kind, content, created_at').eq('audit_id', auditId).eq('user_id', userId),
    supabase.from('ai_usage').select('count').eq('user_id', userId).eq('day', madridDay(now)).maybeSingle(),
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

function InvalidChecksAlert() {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md border border-fail px-4 py-3 text-ink">
      <StatusIcon status="fail" className="mt-1" />
      No se pudieron mostrar los resultados de esta auditoría. Vuelve a auditar el sitio.
    </p>
  )
}

type OkAuditBodyProps = {
  supabase: Supabase
  userId: string
  siteUrl: string
  audit: AuditRow
  compareParam: string | string[] | undefined
  action: string
  now: Date
  /** "Volver a auditar" form, with the limits of the site already applied. */
  reAuditAction: ReactNode
}

async function OkAuditBody(props: OkAuditBodyProps) {
  const { supabase, userId, siteUrl, audit, compareParam, action, now, reAuditAction } = props
  const checks = parseChecks(audit.checks)
  if (!checks.ok) {
    console.error('[AuditPage] invalid checks', audit.id, checks.error)
    return <InvalidChecksAlert />
  }

  const requestedId = parseCompareParam(compareParam, audit.id)
  const [rows, ai] = await Promise.all([
    loadComparisonRows(supabase, userId, audit, requestedId),
    loadAiData(supabase, userId, audit.id, now),
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
      remaining={ai.remaining}
      loadError={ai.loadError}
    />
  ) : null

  const report = buildAuditReport({
    url: siteUrl,
    createdAt: audit.created_at,
    checks: checks.checks,
    score: audit.score,
    seoScore: audit.seo_score,
    aiScore: audit.ai_score,
  })

  return (
    <>
      <ReportIndex hasIssues={report.issues.length > 0} />
      <ReportView
        report={report}
        previous={previous ? { score: previous.score, date: previous.created_at } : null}
        relativeTime={formatRelativeTime(audit.created_at, now)}
        reAuditAction={reAuditAction}
      />
      <PlanSection
        siteId={audit.site_id}
        auditId={audit.id}
        report={ai.reports.plan}
        checks={checks.checks}
        siteUrl={siteUrl}
        score={report.score}
        remaining={ai.remaining}
        loadError={ai.loadError}
      />
      <ComparisonSection comparison={comparison} options={rows.options} action={action} aiSummary={aiSummary} />
    </>
  )
}

async function AuditContent({ params, searchParams }: AuditPageProps) {
  // Per-request render: relative time and today's AI quota depend on now (D-QA-08).
  await connection()
  const now = new Date()
  const [rawParams, query] = await Promise.all([params, searchParams])
  const { supabase, userId, site, audit } = await loadAudit(rawParams)
  const displayName = siteDisplayName(site.name, site.url)
  const action = `/sitios/${site.id}/auditorias/${audit.id}`
  // What limits "Volver a auditar": the 1-minute wait of the site and the audits left today (D-UX-11).
  const reAudit = (
    <AuditSiteForm
      siteId={site.id}
      siteName={displayName}
      label="Volver a auditar"
      variant="primary"
      cooldown={auditCooldown(site.last_audit_started_at, now)}
      remaining={await loadRemainingAudits(supabase, userId, now)}
    />
  )

  return (
    <>
      <BackLink href={`/sitios/${site.id}`}>Volver a {displayName}</BackLink>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold tracking-display break-words sm:text-5xl">
          Auditoría de {displayName}
        </h1>
        <p className="font-mono text-sm break-all text-ink-muted">{site.url}</p>
      </header>
      {audit.status === 'error' ? (
        <section aria-labelledby="failed-title" className="flex flex-col items-start gap-4 rounded-md border border-fail bg-panel p-5">
          <h2 id="failed-title" className="flex items-center gap-2 text-lg font-semibold">
            <StatusIcon status="fail" />
            La auditoría falló
          </h2>
          <p className="text-ink-muted">{audit.error ?? 'Error desconocido.'}</p>
          <p className="text-sm text-ink-muted">
            <time dateTime={audit.created_at} className="font-mono text-ink">
              {formatAbsoluteDate(audit.created_at)}
            </time>{' '}
            · {formatRelativeTime(audit.created_at, now)}
          </p>
          {reAudit}
        </section>
      ) : (
        <OkAuditBody
          supabase={supabase}
          userId={userId}
          siteUrl={site.url}
          audit={audit}
          compareParam={query.comparar}
          action={action}
          now={now}
          reAuditAction={reAudit}
        />
      )}
    </>
  )
}

export default function AuditPage(props: AuditPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={<DetailSkeleton variant="audit" label="Cargando la auditoría…" />}>
        <AuditContent {...props} />
      </Suspense>
    </div>
  )
}
