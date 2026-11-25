import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUDIT_ID,
  DETAIL,
  CHANGES_FAILED_MSG,
  QUOTA_MSG,
  SITE_ID,
  audit,
  previous,
  summary,
  callsOf,
  form,
  generateChangeSummary,
  okAudit,
  queueResults,
  quota,
  resetHarness,
  revalidatePath,
  rpc,
  signedIn,
} from './harness'

vi.mock('@/lib/supabase/server', async () => {
  const h = await import('./harness')
  return { createClient: vi.fn(async () => ({ auth: { getUser: h.getUser }, from: h.from, rpc: h.rpc })) }
})
vi.mock('next/cache', async () => ({ revalidatePath: (await import('./harness')).revalidatePath }))
vi.mock('@/lib/ai/generate', async () => {
  const h = await import('./harness')
  return { generateActionPlan: h.generateActionPlan, generateChangeSummary: h.generateChangeSummary }
})

import { generateChanges } from '../actions'

beforeEach(resetHarness)

describe('generateChanges', () => {
  it('sin auditoría ok anterior no consume cuota ni llama al modelo', async () => {
    signedIn()
    okAudit({ data: null, error: null })
    const result = await generateChanges({}, form())
    expect(result).toEqual({ error: 'No hay una auditoría anterior con la que comparar.' })
    expect(callsOf('audits', 1)).toEqual([
      { method: 'select', args: ['id, site_id, status, score, seo_score, ai_score, checks, created_at'] },
      { method: 'eq', args: ['site_id', SITE_ID] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['status', 'ok'] },
      { method: 'lt', args: ['created_at', audit.created_at] },
      { method: 'order', args: ['created_at', { ascending: false }] },
      { method: 'limit', args: [1] },
      { method: 'maybeSingle', args: [] },
    ])
    expect(rpc).not.toHaveBeenCalled()
    expect(generateChangeSummary).not.toHaveBeenCalled()
  })

  it('responde genérico si falla la lectura de la anterior o sus checks son inválidos', async () => {
    signedIn()
    okAudit({ data: null, error: { message: 'boom' } })
    expect(await generateChanges({}, form())).toEqual({ error: CHANGES_FAILED_MSG })
    okAudit({ data: { ...previous, checks: 'roto' }, error: null })
    expect(await generateChanges({}, form())).toEqual({ error: CHANGES_FAILED_MSG })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('con la cuota agotada no llama al modelo (D-AI-03)', async () => {
    signedIn()
    okAudit({ data: previous, error: null })
    quota(-1)
    const result = await generateChanges({}, form())
    expect(result).toEqual({ error: QUOTA_MSG })
    expect(generateChangeSummary).not.toHaveBeenCalled()
  })

  it('genera el resumen contra la anterior, hace upsert y revalida', async () => {
    signedIn()
    okAudit({ data: previous, error: null })
    quota(5)
    queueResults('ai_reports', { error: null })
    generateChangeSummary.mockResolvedValue(summary)
    const result = await generateChanges({}, form())
    expect(result).toEqual({ message: 'Resumen de cambios generado.' })
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(generateChangeSummary.mock.invocationCallOrder[0])
    const input = generateChangeSummary.mock.calls[0][0]
    expect(input.prev.score).toBe(50)
    expect(input.curr.score).toBe(62)
    expect(input.diff.improved).toHaveLength(0)
    expect(input.diff.regressed.map((c: { id: string }) => c.id)).toEqual(['title'])
    expect(callsOf('ai_reports')[0]).toEqual({
      method: 'upsert',
      args: [
        { audit_id: AUDIT_ID, user_id: 'user-1', kind: 'changes', content: summary, model: 'anthropic/claude-haiku-5-5' },
        { onConflict: 'audit_id,kind' },
      ],
    })
    expect(revalidatePath).toHaveBeenCalledWith(DETAIL)
  })

  it('si falla el modelo devuelve la cuota y el mensaje genérico del resumen', async () => {
    signedIn()
    okAudit({ data: previous, error: null })
    quota(1)
    generateChangeSummary.mockRejectedValue(new Error('timeout'))
    const result = await generateChanges({}, form())
    expect(result).toEqual({ error: CHANGES_FAILED_MSG })
    expect(rpc).toHaveBeenCalledWith('refund_ai_quota')
  })
})
