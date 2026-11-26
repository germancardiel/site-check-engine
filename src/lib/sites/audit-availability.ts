import { formatCountdown, secondsUntil } from '@/lib/countdown'
import { AUDIT_DAILY_LIMIT, AUDIT_LIMIT_MESSAGE } from '@/lib/limits'

/** Minimum time between two audits of the same site; the database enforces it in `start_audit`. */
export const AUDIT_COOLDOWN_MS = 60_000

/** When a site can be audited again: `null` when it already can. */
export type AuditCooldown = {
  /** ISO moment when the cooldown ends; the client counts down to it. */
  availableAt: string
  /** Seconds left when the page was rendered (first paint, before the client clock takes over). */
  secondsLeft: number
} | null

/** Cooldown of a site from its `last_audit_started_at`, at `now`. */
export function auditCooldown(lastStartedAt: string | null, now: Date): AuditCooldown {
  if (!lastStartedAt) return null
  const started = Date.parse(lastStartedAt)
  if (Number.isNaN(started)) return null
  const availableAt = started + AUDIT_COOLDOWN_MS
  const secondsLeft = secondsUntil(availableAt, now.getTime())
  return secondsLeft > 0 ? { availableAt: new Date(availableAt).toISOString(), secondsLeft } : null
}

/** Audits left today given the stored counter (missing row = none used). */
export function remainingAudits(used: number | null | undefined, limit = AUDIT_DAILY_LIMIT): number {
  return Math.max(0, Math.min(limit, limit - (used ?? 0)))
}

export function auditQuotaLabel(remaining: number): string {
  return remaining === 1 ? 'Te queda 1 auditoría hoy.' : `Te quedan ${remaining} auditorías hoy.`
}

export function cooldownLabel(secondsLeft: number): string {
  return `Disponible en ${formatCountdown(secondsLeft)}. Hay que esperar un minuto entre dos auditorías del mismo sitio.`
}

/**
 * Why the "Auditar" button is disabled, or `null` when it can be pressed (D-UX-11).
 * `remaining` is `null` when today's usage could not be read: the database still enforces it.
 */
export function auditBlockReason(remaining: number | null, secondsLeft: number): string | null {
  if (remaining !== null && remaining <= 0) return AUDIT_LIMIT_MESSAGE
  if (secondsLeft > 0) return cooldownLabel(secondsLeft)
  return null
}
