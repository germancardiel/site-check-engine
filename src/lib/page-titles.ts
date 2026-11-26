import { SITE_NAME } from '@/lib/brand'
import { formatAbsoluteDate } from '@/lib/format'

/** Tab title of the site detail: the site name first, so tabs are told apart. */
export function sitePageTitle(displayName: string | null): string {
  return displayName ? `${displayName} · ${SITE_NAME}` : `Sitio · ${SITE_NAME}`
}

/** Tab title of an audit: site name and date of the audit. */
export function auditPageTitle(displayName: string | null, createdAt: string | null): string {
  if (!displayName) return `Auditoría · ${SITE_NAME}`
  const date = createdAt ? ` del ${formatAbsoluteDate(createdAt)}` : ''
  return `Auditoría de ${displayName}${date} · ${SITE_NAME}`
}
