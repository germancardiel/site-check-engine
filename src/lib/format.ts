const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
]

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** Formats `date` relative to `now` in Spanish, e.g. "hace 5 minutos" or "ayer". */
export function formatRelativeTime(date: Date | string, now: Date): string {
  const target = typeof date === 'string' ? new Date(date) : date
  const diffSeconds = Math.round((target.getTime() - now.getTime()) / 1000)
  if (Number.isNaN(diffSeconds)) return ''
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return 'hace un momento'

  const { unit, seconds } =
    RELATIVE_UNITS.find((candidate) => abs >= candidate.seconds) ?? RELATIVE_UNITS[RELATIVE_UNITS.length - 1]
  return relativeFormatter.format(Math.trunc(diffSeconds / seconds), unit)
}

/** Name to show for a site: its own name or, if it has none, the URL host. */
export function siteDisplayName(name: string | null, url: string): string {
  if (name && name.trim() !== '') return name
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Time zone used to show absolute dates (the server renders in UTC). */
export const APP_TIME_ZONE = 'Europe/Madrid'

const absoluteFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE,
})

const shortFormatter = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  timeZone: APP_TIME_ZONE,
})

function toDate(date: Date | string): Date | null {
  const target = typeof date === 'string' ? new Date(date) : date
  return Number.isNaN(target.getTime()) ? null : target
}

/** Absolute date and time in Spanish, e.g. "25 nov 2026, 10:30". */
export function formatAbsoluteDate(date: Date | string): string {
  const target = toDate(date)
  return target ? absoluteFormatter.format(target) : ''
}

/** Short day and month in Spanish, e.g. "25 nov". */
export function formatShortDate(date: Date | string): string {
  const target = toDate(date)
  return target ? shortFormatter.format(target) : ''
}
