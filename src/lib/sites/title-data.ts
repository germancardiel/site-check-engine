import { siteDisplayName } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { siteIdSchema } from '@/lib/validation/site'
import { auditRouteParamsSchema } from '@/lib/validation/audit'

/**
 * Data for the tab titles of the detail pages (`generateMetadata`). It never throws: on any
 * failure it returns `null`s and the page itself shows the error or the not-found state.
 */
export type AuditTitleData = { name: string | null; createdAt: string | null }

const EMPTY: AuditTitleData = { name: null, createdAt: null }

async function signedInClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { supabase, userId: user.id } : null
}

/** Display name of a site of the signed-in user, or `null`. */
export async function loadSiteName(siteId: string): Promise<string | null> {
  const parsed = siteIdSchema.safeParse({ id: siteId })
  if (!parsed.success) return null
  try {
    const session = await signedInClient()
    if (!session) return null
    const { data, error } = await session.supabase
      .from('sites')
      .select('url, name')
      .eq('id', parsed.data.id)
      .eq('user_id', session.userId)
      .maybeSingle()
    if (error) console.error('[loadSiteName]', error)
    return data ? siteDisplayName(data.name, data.url) : null
  } catch (error) {
    console.error('[loadSiteName]', error)
    return null
  }
}

/** Site name and date of an audit of the signed-in user (`null`s when missing). */
export async function loadAuditTitleData(params: { siteId: string; auditId: string }): Promise<AuditTitleData> {
  const parsed = auditRouteParamsSchema.safeParse(params)
  if (!parsed.success) return EMPTY
  const { siteId, auditId } = parsed.data
  try {
    const session = await signedInClient()
    if (!session) return EMPTY
    const { supabase, userId } = session
    const [site, audit] = await Promise.all([
      supabase.from('sites').select('url, name').eq('id', siteId).eq('user_id', userId).maybeSingle(),
      supabase
        .from('audits')
        .select('created_at')
        .eq('id', auditId)
        .eq('site_id', siteId)
        .eq('user_id', userId)
        .maybeSingle(),
    ])
    if (site.error || audit.error) console.error('[loadAuditTitleData]', site.error ?? audit.error)
    return {
      name: site.data ? siteDisplayName(site.data.name, site.data.url) : null,
      createdAt: audit.data?.created_at ?? null,
    }
  } catch (error) {
    console.error('[loadAuditTitleData]', error)
    return EMPTY
  }
}
