'use server'

import { revalidatePath } from 'next/cache'
import { runSafely } from '@/lib/action-safety'
import { diffAudits } from '@/lib/audit/diff'
import { AI_DAILY_LIMIT, AI_MODEL } from '@/lib/ai/config'
import { generateActionPlan, generateChangeSummary } from '@/lib/ai/generate'
import type { PromptAudit } from '@/lib/ai/prompts'
import { AI_QUOTA_EXHAUSTED_MESSAGE } from '@/lib/ai/reports'
import { createClient } from '@/lib/supabase/server'
import type { AiReportKind, Json, Tables } from '@/lib/supabase/types'
import { aiReportInputSchema, type AiActionState, type AiReportInput } from '@/lib/validation/ai'
import { parseChecks } from '@/lib/validation/audit'
import { firstIssueMessage } from '@/lib/validation/auth'
import { readTextField } from '@/lib/validation/site'

const SESSION_EXPIRED = 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
const AUDIT_NOT_FOUND = 'No se encontró la auditoría.'
const AUDIT_NOT_OK = 'Solo se puede usar la IA con auditorías completadas.'
const NO_PREVIOUS = 'No hay una auditoría anterior con la que comparar.'
const GENERATION_FAILED: Record<AiReportKind, string> = {
  plan: 'No se pudo generar el plan. Inténtalo de nuevo.',
  changes: 'No se pudo generar el resumen. Inténtalo de nuevo.',
}
const SCOPE: Record<AiReportKind, string> = { plan: 'generatePlan', changes: 'generateChanges' }

const AUDIT_COLUMNS = 'id, site_id, status, score, seo_score, ai_score, checks, created_at'

type Supabase = Awaited<ReturnType<typeof createClient>>
type AuditRow = Pick<
  Tables<'audits'>,
  'id' | 'site_id' | 'status' | 'score' | 'seo_score' | 'ai_score' | 'checks' | 'created_at'
>
type Context = { supabase: Supabase; userId: string; input: AiReportInput; audit: AuditRow; prompt: PromptAudit }
type Prepared = { ok: true; ctx: Context } | { ok: false; error: string }

function toPromptAudit(url: string, audit: AuditRow, scope: string): PromptAudit | null {
  const checks = parseChecks(audit.checks)
  if (!checks.ok) {
    console.error(`[${scope}] invalid checks`, audit.id, checks.error)
    return null
  }
  return { url, score: audit.score, seoScore: audit.seo_score, aiScore: audit.ai_score, checks: checks.checks }
}

/** Steps 1 and 2: validates the ids, checks the session and reads the user's `ok` audit. */
async function prepare(formData: FormData, kind: AiReportKind): Promise<Prepared> {
  const scope = SCOPE[kind]
  const parsed = aiReportInputSchema.safeParse({
    siteId: readTextField(formData, 'siteId'),
    auditId: readTextField(formData, 'auditId'),
  })
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) }
  const input = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: SESSION_EXPIRED }

  const [siteResult, auditResult] = await Promise.all([
    supabase.from('sites').select('url').eq('id', input.siteId).eq('user_id', user.id).maybeSingle(),
    supabase
      .from('audits')
      .select(AUDIT_COLUMNS)
      .eq('id', input.auditId)
      .eq('site_id', input.siteId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])
  if (siteResult.error) console.error(`[${scope}] site`, siteResult.error)
  if (auditResult.error) console.error(`[${scope}] audit`, auditResult.error)
  const audit = auditResult.data
  if (!siteResult.data || !audit) return { ok: false, error: AUDIT_NOT_FOUND }
  if (audit.status !== 'ok') return { ok: false, error: AUDIT_NOT_OK }

  const prompt = toPromptAudit(siteResult.data.url, audit, scope)
  if (!prompt) return { ok: false, error: GENERATION_FAILED[kind] }
  return { ok: true, ctx: { supabase, userId: user.id, input, audit, prompt } }
}

async function loadPreviousAudit(ctx: Context): Promise<PromptAudit | { error: string }> {
  const { data, error } = await ctx.supabase
    .from('audits')
    .select(AUDIT_COLUMNS)
    .eq('site_id', ctx.audit.site_id)
    .eq('user_id', ctx.userId)
    .eq('status', 'ok')
    .lt('created_at', ctx.audit.created_at)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[generateChanges] previous', error)
    return { error: GENERATION_FAILED.changes }
  }
  if (!data) return { error: NO_PREVIOUS }
  return toPromptAudit(ctx.prompt.url, data, 'generateChanges') ?? { error: GENERATION_FAILED.changes }
}

async function refundQuota(supabase: Supabase, scope: string): Promise<void> {
  const { error } = await supabase.rpc('refund_ai_quota')
  if (error) console.error(`[${scope}] refund`, error)
}

/** Steps 3 to 6: consumes quota before calling the model, saves the report and revalidates. */
async function runGeneration(
  ctx: Context,
  kind: AiReportKind,
  generate: () => Promise<Json>,
): Promise<AiActionState> {
  const scope = SCOPE[kind]
  const { data: count, error: quotaError } = await ctx.supabase.rpc('consume_ai_quota', { p_limit: AI_DAILY_LIMIT })
  if (quotaError) {
    console.error(`[${scope}] quota`, quotaError)
    return { error: GENERATION_FAILED[kind] }
  }
  if (count === -1) return { error: AI_QUOTA_EXHAUSTED_MESSAGE, quotaExceeded: true }

  try {
    const content = await generate()
    const { error } = await ctx.supabase
      .from('ai_reports')
      .upsert(
        { audit_id: ctx.audit.id, user_id: ctx.userId, kind, content, model: AI_MODEL },
        { onConflict: 'audit_id,kind' },
      )
    if (error) throw error
  } catch (error) {
    console.error(`[${scope}]`, error)
    await refundQuota(ctx.supabase, scope)
    return { error: GENERATION_FAILED[kind] }
  }

  revalidatePath(`/sitios/${ctx.input.siteId}/auditorias/${ctx.input.auditId}`)
  return { message: kind === 'plan' ? 'Plan de acción generado.' : 'Resumen de cambios generado.' }
}

export async function generatePlan(_: AiActionState, formData: FormData): Promise<AiActionState> {
  // Any exception becomes a recoverable error: the audit stays visible (D-UX-12, D-AI-05).
  return runSafely<AiActionState>('generatePlan', { error: GENERATION_FAILED.plan }, async () => {
    const prepared = await prepare(formData, 'plan')
    if (!prepared.ok) return { error: prepared.error }
    const { ctx } = prepared
    return runGeneration(ctx, 'plan', () => generateActionPlan(ctx.prompt))
  })
}

async function generateChangesUnsafe(formData: FormData): Promise<AiActionState> {
  const prepared = await prepare(formData, 'changes')
  if (!prepared.ok) return { error: prepared.error }
  const { ctx } = prepared

  const previous = await loadPreviousAudit(ctx)
  if ('error' in previous) return { error: previous.error }

  const diff = diffAudits(
    { score: previous.score, seoScore: previous.seoScore, aiScore: previous.aiScore, checks: previous.checks },
    { score: ctx.audit.score, seoScore: ctx.audit.seo_score, aiScore: ctx.audit.ai_score, checks: ctx.prompt.checks },
  )
  return runGeneration(ctx, 'changes', () =>
    generateChangeSummary({ diff, prev: previous, curr: ctx.prompt }),
  )
}

export async function generateChanges(_: AiActionState, formData: FormData): Promise<AiActionState> {
  return runSafely<AiActionState>('generateChanges', { error: GENERATION_FAILED.changes }, () =>
    generateChangesUnsafe(formData),
  )
}
