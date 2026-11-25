import { vi } from 'vitest'

/** Shared Supabase / AI mocks for the audit-detail server action tests (no network). */
type Result = { data?: unknown; error: unknown }
type Call = { method: string; args: unknown[] }

export const getUser = vi.fn()
export const rpc = vi.fn()
export const revalidatePath = vi.fn()
export const generateActionPlan = vi.fn()
export const generateChangeSummary = vi.fn()

const queries: Array<{ table: string; calls: Call[] }> = []
const results: Record<string, Result[]> = {}

export const from = vi.fn((table: string) => {
  const calls: Call[] = []
  queries.push({ table, calls })
  const result = () => results[table]?.shift() ?? { data: null, error: null }
  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => resolve(result()),
    maybeSingle: () => {
      calls.push({ method: 'maybeSingle', args: [] })
      return Promise.resolve(result())
    },
  }
  for (const method of ['select', 'upsert', 'eq', 'lt', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }
  return builder
})

export function resetHarness() {
  vi.clearAllMocks()
  queries.length = 0
  for (const key of Object.keys(results)) delete results[key]
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

export function queueResults(table: string, ...items: Result[]) {
  results[table] = items
}

export function callsOf(table: string, index = 0): Call[] {
  return queries.filter((q) => q.table === table)[index]?.calls ?? []
}

export const USER = { id: 'user-1' }
export const SITE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
export const AUDIT_ID = '0b3c4a9e-5d1f-4f7a-9c2b-8e6d1a2b3c4d'
export const PREV_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
export const DETAIL = `/sitios/${SITE_ID}/auditorias/${AUDIT_ID}`

export const QUOTA_MSG = 'Has alcanzado el límite diario de generaciones con IA. Vuelve mañana.'
export const FAILED_MSG = 'No se pudo generar el plan. Inténtalo de nuevo.'
export const CHANGES_FAILED_MSG = 'No se pudo generar el resumen. Inténtalo de nuevo.'

export const checks = [
  { id: 'title', category: 'seo', title: 'Título', status: 'fail', weight: 5, message: 'm', recommendation: 'r' },
]
export const audit = {
  id: AUDIT_ID,
  site_id: SITE_ID,
  status: 'ok',
  score: 62,
  seo_score: 70,
  ai_score: 50,
  checks,
  created_at: '2026-11-25T10:00:00.000Z',
}
export const previous = {
  ...audit,
  id: PREV_ID,
  score: 50,
  checks: [{ ...checks[0], status: 'pass' }],
  created_at: '2026-11-24T10:00:00.000Z',
}
export const plan = { summary: 'Resumen', actions: [] }
export const summary = { summary: 'Cambios', highlights: ['x'] }

export function form(entries: Record<string, string> = { siteId: SITE_ID, auditId: AUDIT_ID }): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

export function signedIn() {
  getUser.mockResolvedValue({ data: { user: USER }, error: null })
}

export function okAudit(...extra: Result[]) {
  queueResults('sites', { data: { url: 'https://ejemplo.com' }, error: null })
  queueResults('audits', { data: audit, error: null }, ...extra)
}

export function quota(count: number) {
  rpc.mockImplementation(async (fn: string) =>
    fn === 'consume_ai_quota' ? { data: count, error: null } : { data: null, error: null },
  )
}

