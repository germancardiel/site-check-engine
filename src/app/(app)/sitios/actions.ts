'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { runSafely } from '@/lib/action-safety'
import { runAudit, type AuditOutcome } from '@/lib/audit'
import { AUDIT_DAILY_LIMIT, AUDIT_LIMIT_MESSAGE, SITE_LIMIT_MESSAGE } from '@/lib/limits'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/types'
import { firstIssueMessage } from '@/lib/validation/auth'
import { readFormValues, validationErrorState } from '@/lib/validation/form-state'
import {
  SITE_FIELDS,
  readTextField,
  siteIdSchema,
  siteSchema,
  type SiteActionState,
} from '@/lib/validation/site'

const SESSION_EXPIRED = 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
const SITE_NOT_FOUND = 'No se encontró el sitio.'
const DUPLICATE_SITE = 'Ya tienes este sitio.'
const RATE_LIMITED = 'Espera un minuto antes de volver a auditar este sitio.'
const SAVE_SITE_FAILED = 'No se pudo guardar el sitio. Inténtalo de nuevo.'
const DELETE_SITE_FAILED = 'No se pudo borrar el sitio. Inténtalo de nuevo.'
const AUDIT_FAILED = 'No se pudo completar la auditoría. Inténtalo de nuevo.'
const UNIQUE_VIOLATION = '23505'
// Raised by the `sites_enforce_limit` trigger (migration 20261126000000_usage_limits.sql).
const RAISE_EXCEPTION = 'P0001'
const SITE_LIMIT_ERROR = 'site_limit_reached'

function isSiteLimitError(error: { code?: string; message?: string }): boolean {
  return error.code === RAISE_EXCEPTION && error.message === SITE_LIMIT_ERROR
}

/** Maps the engine result to an `audits` row; failed audits are stored too. */
function toAuditRow(siteId: string, userId: string, outcome: AuditOutcome): TablesInsert<'audits'> {
  if (outcome.status === 'error') {
    return { site_id: siteId, user_id: userId, status: 'error', checks: [], error: outcome.error }
  }
  return {
    site_id: siteId,
    user_id: userId,
    status: 'ok',
    score: outcome.score,
    seo_score: outcome.seoScore,
    ai_score: outcome.aiScore,
    checks: outcome.checks,
    error: null,
  }
}

/** Result of an action body: a state for the form, or the page to go to once everything is saved. */
type Outcome = { state: SiteActionState } | { redirectTo: string }

/** `redirect()` throws to navigate, so it is called here, outside the `try` of `runSafely`. */
function finish(outcome: Outcome): SiteActionState {
  if ('state' in outcome) return outcome.state
  redirect(outcome.redirectTo)
}

async function getSessionClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Signs the current user out. Takes no input, so there is nothing to validate. */
export async function logout(): Promise<void> {
  const { supabase, user } = await getSessionClient()

  if (user) {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[logout]', error)
  }

  redirect('/login')
}

export async function createSite(_: SiteActionState, formData: FormData): Promise<SiteActionState> {
  // What the user typed goes back with every error, so the form keeps it (D-UX-08).
  const values = readFormValues(formData, SITE_FIELDS)
  const outcome = await runSafely<Outcome>('createSite', { state: { error: SAVE_SITE_FAILED, values } }, () =>
    insertSite(formData, values),
  )
  return finish(outcome)
}

async function insertSite(formData: FormData, values: SiteActionState['values']): Promise<Outcome> {
  const parsed = siteSchema.safeParse({
    url: readTextField(formData, 'url'),
    name: readTextField(formData, 'name'),
  })
  if (!parsed.success) return { state: { ...validationErrorState(parsed.error, SITE_FIELDS), values } }

  const { supabase, user } = await getSessionClient()
  if (!user) return { state: { error: SESSION_EXPIRED, values } }

  const { data, error } = await supabase
    .from('sites')
    .insert({ user_id: user.id, url: parsed.data.url, name: parsed.data.name })
    .select('id')
    .single()
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { state: { error: DUPLICATE_SITE, values } }
    if (isSiteLimitError(error)) return { state: { error: SITE_LIMIT_MESSAGE, values } }
    console.error('[createSite]', error)
    return { state: { error: SAVE_SITE_FAILED, values } }
  }

  revalidatePath('/sitios')
  // The new site page has no audits yet: its empty state offers "Auditar ahora".
  return { redirectTo: `/sitios/${data.id}` }
}

export async function deleteSite(_: SiteActionState, formData: FormData): Promise<SiteActionState> {
  return runSafely<SiteActionState>('deleteSite', { error: DELETE_SITE_FAILED }, () => removeSite(formData))
}

async function removeSite(formData: FormData): Promise<SiteActionState> {
  const parsed = siteIdSchema.safeParse({ id: readTextField(formData, 'id') })
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) }

  const { supabase, user } = await getSessionClient()
  if (!user) return { error: SESSION_EXPIRED }

  // Audits are removed by the `on delete cascade` of audits.site_id.
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
  if (error) {
    console.error('[deleteSite]', error)
    return { error: DELETE_SITE_FAILED }
  }

  revalidatePath('/sitios')
  return { message: 'Sitio borrado.' }
}

export async function auditSite(_: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const outcome = await runSafely<Outcome>('auditSite', { state: { error: AUDIT_FAILED } }, () =>
    startAndRunAudit(formData),
  )
  return finish(outcome)
}

async function startAndRunAudit(formData: FormData): Promise<Outcome> {
  const parsed = siteIdSchema.safeParse({ id: readTextField(formData, 'siteId') })
  if (!parsed.success) return { state: { error: firstIssueMessage(parsed.error) } }

  const { supabase, user } = await getSessionClient()
  if (!user) return { state: { error: SESSION_EXPIRED } }

  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, url')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (siteError) console.error('[auditSite] site', siteError)
  if (siteError || !site) return { state: { error: SITE_NOT_FOUND } }

  // Daily quota + per-site cooldown, atomic in the database with its clock (D-SEC-10).
  const { data: started, error: startError } = await supabase.rpc('start_audit', {
    p_site_id: site.id,
    p_limit: AUDIT_DAILY_LIMIT,
  })
  if (startError) {
    console.error('[auditSite] start', startError)
    return { state: { error: 'No se pudo iniciar la auditoría. Inténtalo de nuevo.' } }
  }
  if (started === 'quota') return { state: { error: AUDIT_LIMIT_MESSAGE } }
  if (started === 'not_found') return { state: { error: SITE_NOT_FOUND } }
  if (started !== 'ok') return { state: { error: RATE_LIMITED } }

  // Server action (not prerendered): reading the clock here is safe; `src/lib` receives it (D-QA-08).
  const outcome = await runAudit(site.url, { now: new Date() })
  const { data: audit, error: insertError } = await supabase
    .from('audits')
    .insert(toAuditRow(site.id, user.id, outcome))
    .select('id')
    .single()
  if (insertError) {
    console.error('[auditSite] insert', insertError)
    return { state: { error: 'No se pudo guardar la auditoría. Inténtalo de nuevo.' } }
  }

  revalidatePath('/sitios')
  revalidatePath(`/sitios/${site.id}`)
  // Failed audits are stored too: their page explains the error and offers to audit again.
  return { redirectTo: `/sitios/${site.id}/auditorias/${audit.id}` }
}
