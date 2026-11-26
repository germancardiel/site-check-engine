import { vi } from 'vitest'

/** Shared Supabase / Next / audit-engine mocks for the `/sitios` server action tests (no network). */
type Result = { data?: unknown; error: unknown }
type Call = { method: string; args: unknown[] }

export const getUser = vi.fn()
export const signOut = vi.fn()
export const rpc = vi.fn()
export const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})
export const revalidatePath = vi.fn()
export const runAudit = vi.fn()

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
    single: () => {
      calls.push({ method: 'single', args: [] })
      return Promise.resolve(result())
    },
  }
  for (const method of ['select', 'insert', 'delete', 'eq']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }
  return builder
})

export const USER = { id: 'user-1' }
export const SITE_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'
export const AUDIT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

export function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

export function queueResults(table: string, ...items: Result[]) {
  results[table] = items
}

export function callsOf(table: string, index = 0): Call[] {
  return queries.filter((q) => q.table === table)[index]?.calls ?? []
}

export function signedIn() {
  getUser.mockResolvedValue({ data: { user: USER }, error: null })
}

export function signedOut() {
  getUser.mockResolvedValue({ data: { user: null }, error: null })
}

export function resetHarness() {
  vi.clearAllMocks()
  queries.length = 0
  for (const key of Object.keys(results)) delete results[key]
  vi.spyOn(console, 'error').mockImplementation(() => {})
}
