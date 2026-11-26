import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { createClient } from '@/lib/supabase/server'
import { loadRemainingAudits } from '@/lib/sites/audit-usage'

type Supabase = Awaited<ReturnType<typeof createClient>>

const calls: Array<[string, unknown[]]> = []

function fakeClient(result: { data: unknown; error: unknown }): Supabase {
  const builder = {
    select: (...args: unknown[]) => (calls.push(['select', args]), builder),
    eq: (...args: unknown[]) => (calls.push(['eq', args]), builder),
    maybeSingle: async () => result,
  }
  const client = { from: (table: string) => (calls.push(['from', [table]]), builder) }
  return client as unknown as Supabase
}

beforeEach(() => {
  calls.length = 0
  vi.restoreAllMocks()
})

describe('loadRemainingAudits', () => {
  it('lee el contador del usuario del día de Madrid y devuelve lo que queda', async () => {
    const now = new Date('2026-11-26T23:30:00.000Z') // ya es día 27 en Madrid
    const remaining = await loadRemainingAudits(fakeClient({ data: { count: 12 }, error: null }), 'user-1', now)
    expect(remaining).toBe(3)
    expect(calls).toEqual([
      ['from', ['audit_usage']],
      ['select', ['count']],
      ['eq', ['user_id', 'user-1']],
      ['eq', ['day', '2026-11-27']],
    ])
  })

  it('sin fila del día quedan las 15', async () => {
    expect(await loadRemainingAudits(fakeClient({ data: null, error: null }), 'u', new Date())).toBe(15)
  })

  it('si falla la lectura registra el error y devuelve null', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const remaining = await loadRemainingAudits(fakeClient({ data: null, error: { message: 'boom' } }), 'u', new Date())
    expect(remaining).toBeNull()
    expect(error).toHaveBeenCalledWith('[loadRemainingAudits]', { message: 'boom' })
  })
})
