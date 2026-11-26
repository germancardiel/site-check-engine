import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUDIT_ID,
  DETAIL,
  CHANGES_FAILED_MSG,
  FAILED_MSG,
  QUOTA_MSG,
  audit,
  checks,
  plan,
  callsOf,
  form,
  from,
  generateActionPlan,
  generateChangeSummary,
  getUser,
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

import { generateChanges, generatePlan } from '../actions'

beforeEach(resetHarness)

describe.each([
  ['generatePlan', generatePlan, FAILED_MSG],
  ['generateChanges', generateChanges, CHANGES_FAILED_MSG],
] as const)('%s: validación, sesión y propiedad', (_, action, failedMsg) => {
  it('rechaza ids inválidos sin tocar Supabase ni el modelo', async () => {
    const result = await action({}, form({ siteId: 'x', auditId: AUDIT_ID }))
    expect(result).toEqual({ error: 'La auditoría no es válida.' })
    expect(getUser).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('no hace nada sin sesión', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await action({}, form())
    expect(result).toEqual({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' })
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('no encuentra auditorías ajenas (filtra por user_id) y no consume cuota', async () => {
    signedIn()
    queueResults('sites', { data: null, error: null })
    queueResults('audits', { data: null, error: null })
    const result = await action({}, form())
    expect(result).toEqual({ error: 'No se encontró la auditoría.' })
    expect(callsOf('audits')).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] })
    expect(callsOf('sites')).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('registra el error si falla la lectura y responde genérico', async () => {
    signedIn()
    queueResults('sites', { data: null, error: { message: 'boom' } })
    queueResults('audits', { data: null, error: { message: 'boom' } })
    const result = await action({}, form())
    expect(result).toEqual({ error: 'No se encontró la auditoría.' })
    expect(console.error).toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rechaza auditorías con estado error', async () => {
    signedIn()
    queueResults('sites', { data: { url: 'https://ejemplo.com' }, error: null })
    queueResults('audits', { data: { ...audit, status: 'error', checks: [] }, error: null })
    const result = await action({}, form())
    expect(result).toEqual({ error: 'Solo se puede usar la IA con auditorías completadas.' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rechaza checks inválidos guardados sin consumir cuota', async () => {
    signedIn()
    queueResults('sites', { data: { url: 'https://ejemplo.com' }, error: null })
    queueResults('audits', { data: { ...audit, checks: [{ id: 1 }] }, error: null })
    const result = await action({}, form())
    expect(result).toEqual({ error: failedMsg })
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe.each([
  ['generatePlan', generatePlan, FAILED_MSG, generateActionPlan],
  ['generateChanges', generateChanges, CHANGES_FAILED_MSG, generateChangeSummary],
] as const)('%s: nunca lanza al cliente (D-UX-12)', (scope, action, failedMsg, model) => {
  it('si la sesión o Supabase lanzan devuelve un error recuperable y lo registra', async () => {
    const boom = new Error('fetch failed')
    getUser.mockRejectedValue(boom)
    const result = await action({}, form())
    expect(result).toEqual({ error: failedMsg })
    expect(console.error).toHaveBeenCalledWith(`[${scope}]`, boom)
  })

  it('si el rpc de cuota lanza tampoco llama al modelo ni lanza', async () => {
    signedIn()
    okAudit({ data: { ...audit, id: 'prev' }, error: null })
    rpc.mockRejectedValue(new Error('socket hang up'))
    const result = await action({}, form())
    expect(result).toEqual({ error: failedMsg })
    expect(model).not.toHaveBeenCalled()
  })
})

describe('generatePlan', () => {
  it('con la cuota agotada no llama al modelo ni guarda nada (D-AI-03)', async () => {
    signedIn()
    okAudit()
    quota(-1)
    const result = await generatePlan({}, form())
    expect(result).toEqual({ error: QUOTA_MSG, quotaExceeded: true })
    expect(rpc).toHaveBeenCalledWith('consume_ai_quota', { p_limit: 10 })
    expect(generateActionPlan).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalledWith('ai_reports')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('consume la cuota antes de llamar al modelo, hace upsert y revalida el detalle', async () => {
    signedIn()
    okAudit()
    quota(3)
    queueResults('ai_reports', { error: null })
    generateActionPlan.mockResolvedValue(plan)
    const result = await generatePlan({}, form())
    expect(result).toEqual({ message: 'Plan de acción generado.' })
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(generateActionPlan.mock.invocationCallOrder[0])
    expect(generateActionPlan).toHaveBeenCalledWith({
      url: 'https://ejemplo.com',
      score: 62,
      seoScore: 70,
      aiScore: 50,
      checks,
    })
    expect(callsOf('ai_reports')).toEqual([
      {
        method: 'upsert',
        args: [
          { audit_id: AUDIT_ID, user_id: 'user-1', kind: 'plan', content: plan, model: 'recursive/flint-v1.0' },
          { onConflict: 'audit_id,kind' },
        ],
      },
    ])
    expect(revalidatePath).toHaveBeenCalledWith(DETAIL)
    expect(rpc).not.toHaveBeenCalledWith('refund_ai_quota')
  })

  it('si falla el modelo devuelve la cuota y un mensaje genérico', async () => {
    signedIn()
    okAudit()
    quota(1)
    const modelError = new Error('gateway down')
    generateActionPlan.mockRejectedValue(modelError)
    const result = await generatePlan({}, form())
    expect(result).toEqual({ error: FAILED_MSG })
    expect(rpc).toHaveBeenCalledWith('refund_ai_quota')
    expect(console.error).toHaveBeenCalledWith('[generatePlan]', modelError)
    expect(from).not.toHaveBeenCalledWith('ai_reports')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('si la salida del modelo es inválida devuelve la cuota', async () => {
    signedIn()
    okAudit()
    quota(1)
    const { AiGenerationError } = await vi.importActual<typeof import('@/lib/ai/generate')>('@/lib/ai/generate')
    generateActionPlan.mockRejectedValue(new AiGenerationError('invalid_output'))
    const result = await generatePlan({}, form())
    expect(result).toEqual({ error: FAILED_MSG })
    expect(rpc).toHaveBeenCalledWith('refund_ai_quota')
  })

  it('si falla el guardado devuelve la cuota y registra el error', async () => {
    signedIn()
    okAudit()
    quota(2)
    const dbError = { message: 'rls' }
    queueResults('ai_reports', { error: dbError })
    generateActionPlan.mockResolvedValue(plan)
    const result = await generatePlan({}, form())
    expect(result).toEqual({ error: FAILED_MSG })
    expect(rpc).toHaveBeenCalledWith('refund_ai_quota')
    expect(console.error).toHaveBeenCalledWith('[generatePlan]', dbError)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('registra el fallo del refund sin cambiar la respuesta', async () => {
    signedIn()
    okAudit()
    rpc.mockImplementation(async (fn: string) =>
      fn === 'consume_ai_quota' ? { data: 1, error: null } : { data: null, error: { message: 'refund' } },
    )
    generateActionPlan.mockRejectedValue(new Error('x'))
    const result = await generatePlan({}, form())
    expect(result).toEqual({ error: FAILED_MSG })
    expect(console.error).toHaveBeenCalledWith('[generatePlan] refund', { message: 'refund' })
  })

  it('si falla el rpc de cuota no llama al modelo', async () => {
    signedIn()
    okAudit()
    rpc.mockResolvedValue({ data: null, error: { message: 'no function' } })
    const result = await generatePlan({}, form())
    expect(result).toEqual({ error: FAILED_MSG })
    expect(generateActionPlan).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalledWith('refund_ai_quota')
  })
})

