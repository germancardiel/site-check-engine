/**
 * Per-user usage limits (D-SEC-10). The database enforces its own fixed caps
 * (`supabase/migrations/20261126000000_usage_limits.sql`); these values must match them.
 */
export const MAX_SITES = 10
export const AUDIT_DAILY_LIMIT = 15

export const SITE_LIMIT_MESSAGE = `Has llegado al máximo de ${MAX_SITES} sitios. Borra uno para añadir otro.`
export const AUDIT_LIMIT_MESSAGE = `Has alcanzado el límite de ${AUDIT_DAILY_LIMIT} auditorías por hoy. Vuelve mañana.`
