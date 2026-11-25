import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'
import { diffAudits } from '@/lib/audit/diff'
import { AI_MODEL, AI_PENDING_HINT, AI_TIMEOUT_MS } from '../config'
import { AiGenerationError, generateActionPlan, generateChangeSummary } from '../generate'
import { PLAN_INSTRUCTIONS } from '../prompts'
import { makeAudit, makeCheck, validChanges, validPlan } from './fixtures'

const { generateText } = vi.hoisted(() => ({ generateText: vi.fn() }))

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  generateText.mockImplementation(actual.generateText)
  return { ...actual, generateText }
})

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
}

function modelReturning(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: USAGE,
      warnings: [],
    }),
  })
}

const audit = makeAudit([makeCheck('title', 'fail'), makeCheck('canonical', 'warn')])

beforeEach(() => {
  generateText.mockClear()
})

describe('generateActionPlan', () => {
  it('devuelve el plan validado usando salida estructurada y el prompt construido', async () => {
    const model = modelReturning(JSON.stringify(validPlan))
    await expect(generateActionPlan(audit, { model })).resolves.toEqual(validPlan)
    const call = model.doGenerateCalls[0]
    expect(call.responseFormat).toMatchObject({ type: 'json' })
    expect(JSON.stringify(call.prompt)).toContain('[title]')
    expect(JSON.stringify(call.prompt)).toContain('en español')
  })

  it('usa por defecto el modelo de AI Gateway "recursive/flint-v1.0" con timeout de 120 s', async () => {
    generateText.mockResolvedValueOnce({ output: validPlan })
    await expect(generateActionPlan(audit)).resolves.toEqual(validPlan)
    expect(AI_MODEL).toBe('recursive/flint-v1.0')
    expect(AI_TIMEOUT_MS).toBe(120_000)
    const options = generateText.mock.calls[0][0]
    expect(options.model).toBe('recursive/flint-v1.0')
    expect(options.instructions).toBe(PLAN_INSTRUCTIONS)
    expect(options.abortSignal).toBeInstanceOf(AbortSignal)
    expect(options.output).toBeDefined()
  })

  it('avisa en la interfaz de que la generación puede tardar uno o dos minutos', () => {
    expect(AI_PENDING_HINT).toBe('Esto puede tardar uno o dos minutos.')
  })

  it('lanza AiGenerationError(invalid_output) si la salida no cumple el esquema', async () => {
    const model = modelReturning(JSON.stringify({ summary: 'x', actions: [] }))
    const error = await generateActionPlan(audit, { model }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AiGenerationError)
    expect((error as AiGenerationError).reason).toBe('invalid_output')
  })

  it('lanza AiGenerationError(invalid_output) si la salida no es JSON', async () => {
    const error = await generateActionPlan(audit, { model: modelReturning('no es json') }).catch((e: unknown) => e)
    expect((error as AiGenerationError).reason).toBe('invalid_output')
  })

  it('revalida la salida aunque el SDK la devuelva sin validar', async () => {
    generateText.mockResolvedValueOnce({ output: { summary: 'x' } })
    const error = await generateActionPlan(audit).catch((e: unknown) => e)
    expect((error as AiGenerationError).reason).toBe('invalid_output')
  })

  it('lanza AiGenerationError(model) si el modelo falla', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error('gateway down')
      },
    })
    const error = await generateActionPlan(audit, { model }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AiGenerationError)
    expect((error as AiGenerationError).reason).toBe('model')
    expect((error as AiGenerationError).name).toBe('AiGenerationError')
  })

  it('aborta la llamada cuando se supera el timeout', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: (options) =>
        new Promise((_, reject) => {
          options.abortSignal?.addEventListener('abort', () => reject(options.abortSignal?.reason))
        }),
    })
    const error = await generateActionPlan(audit, { model, timeoutMs: 10 }).catch((e: unknown) => e)
    expect((error as AiGenerationError).reason).toBe('model')
  })
})

describe('generateChangeSummary', () => {
  it('devuelve el resumen validado con el prompt de cambios', async () => {
    const prev = makeAudit([makeCheck('title', 'fail')])
    const curr = makeAudit([makeCheck('title', 'pass')])
    const diff = diffAudits(
      { score: 50, seoScore: 50, aiScore: 50, checks: prev.checks },
      { score: 62, seoScore: 70, aiScore: 50, checks: curr.checks },
    )
    const model = modelReturning(JSON.stringify(validChanges))
    await expect(generateChangeSummary({ diff, prev, curr }, { model })).resolves.toEqual(validChanges)
    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain('mejora: fail → pass')
  })

  it('lanza AiGenerationError(invalid_output) con highlights vacíos', async () => {
    const prev = makeAudit([])
    const diff = diffAudits({ ...prev }, { ...prev })
    const model = modelReturning(JSON.stringify({ summary: 'x', highlights: [] }))
    const error = await generateChangeSummary({ diff, prev, curr: prev }, { model }).catch((e: unknown) => e)
    expect((error as AiGenerationError).reason).toBe('invalid_output')
  })
})
