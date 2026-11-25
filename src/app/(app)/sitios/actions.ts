'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { runAudit, type AuditOutcome } from '@/lib/audit'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/types'
import { firstIssueMessage } from '@/lib/validation/auth'
import {
  readTextField,
  siteIdSchema,
  siteSchema,
  type SiteActionState,
} from '@/lib/validation/site'

const SESSION_EXPIRED = 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
const SITE_NOT_FOUND = 'No se encontró el sitio.'
const DUPLICATE_SITE = 'Ya tienes este sitio.'
const RATE_LIMITED = 'Espera un minuto antes de volver a auditar este sitio.'
const UNIQUE_VIOLATION = '23505'

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
  const parsed = siteSchema.safeParse({
    url: readTextField(formData, 'url'),
    name: readTextField(formData, 'name'),
  })
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) }

  const { supabase, user } = await getSessionClient()
  if (!user) return { error: SESSION_EXPIRED }

  const { error } = await supabase
    .from('sites')
    .insert({ user_id: user.id, url: parsed.data.url, name: parsed.data.name })
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_SITE }
    console.error('[createSite]', error)
    return { error: 'No se pudo guardar el sitio. Inténtalo de nuevo.' }
  }

  revalidatePath('/sitios')
  return { message: 'Sitio añadido.' }
}

export async function deleteSite(_: SiteActionState, formData: FormData): Promise<SiteActionState> {
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
    return { error: 'No se pudo borrar el sitio. Inténtalo de nuevo.' }
  }

  revalidatePath('/sitios')
  return { message: 'Sitio borrado.' }
}

export async function auditSite(_: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const parsed = siteIdSchema.safeParse({ id: readTextField(formData, 'siteId') })
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) }

  const { supabase, user } = await getSessionClient()
  if (!user) return { error: SESSION_EXPIRED }

  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, url')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (siteError) console.error('[auditSite] site', siteError)
  if (siteError || !site) return { error: SITE_NOT_FOUND }

  // Atomic rate limit with the database clock (no read-then-insert race).
  const { data: claimed, error: claimError } = await supabase.rpc('claim_audit_slot', { p_site_id: site.id })
  if (claimError) {
    console.error('[auditSite] cooldown', claimError)
    return { error: 'No se pudo iniciar la auditoría. Inténtalo de nuevo.' }
  }
  if (claimed !== true) return { error: RATE_LIMITED }

  // Server action (not prerendered): reading the clock here is safe; `src/lib` receives it (D-QA-08).
  const outcome = await runAudit(site.url, { now: new Date() })
  const { error: insertError } = await supabase
    .from('audits')
    .insert(toAuditRow(site.id, user.id, outcome))
  if (insertError) {
    console.error('[auditSite] insert', insertError)
    return { error: 'No se pudo guardar la auditoría. Inténtalo de nuevo.' }
  }

  revalidatePath('/sitios')
  revalidatePath(`/sitios/${site.id}`)
  return outcome.status === 'ok' ? { message: 'Auditoría completada.' } : { error: outcome.error }
}
