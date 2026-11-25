import { describe, expect, it } from 'vitest'
import { actionPlanSchema, changeSummarySchema } from '../schemas'
import { makeAction, validChanges, validPlan } from './fixtures'

describe('actionPlanSchema', () => {
  it('acepta un plan válido', () => {
    expect(actionPlanSchema.safeParse(validPlan).success).toBe(true)
  })

  it('exige un summary de 1 a 600 caracteres', () => {
    expect(actionPlanSchema.safeParse({ ...validPlan, summary: '' }).success).toBe(false)
    expect(actionPlanSchema.safeParse({ ...validPlan, summary: 'a'.repeat(600) }).success).toBe(true)
    expect(actionPlanSchema.safeParse({ ...validPlan, summary: 'a'.repeat(601) }).success).toBe(false)
  })

  it('exige entre 3 y 8 acciones', () => {
    const action = makeAction('Acción', 'alto', 'bajo')
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: [action, action] }).success).toBe(false)
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: Array(8).fill(action) }).success).toBe(true)
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: Array(9).fill(action) }).success).toBe(false)
  })

  it('limita el título a 120 caracteres', () => {
    const long = { ...makeAction('a'.repeat(121), 'alto', 'bajo') }
    const ok = { ...makeAction('a'.repeat(120), 'alto', 'bajo') }
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: [long, ...validPlan.actions] }).success).toBe(false)
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: [ok, ...validPlan.actions] }).success).toBe(true)
  })

  it('solo admite impacto alto/medio/bajo y esfuerzo bajo/medio/alto', () => {
    const badImpact = { ...makeAction('A', 'alto', 'bajo'), impact: 'crítico' }
    const badEffort = { ...makeAction('A', 'alto', 'bajo'), effort: 'enorme' }
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: [badImpact, ...validPlan.actions] }).success).toBe(false)
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: [badEffort, ...validPlan.actions] }).success).toBe(false)
  })

  it('exige checkIds como array de strings y los campos why y how', () => {
    const noIds = { ...makeAction('A', 'alto', 'bajo'), checkIds: 'title' }
    const noWhy = { ...makeAction('A', 'alto', 'bajo'), why: undefined }
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: [noIds, ...validPlan.actions] }).success).toBe(false)
    expect(actionPlanSchema.safeParse({ ...validPlan, actions: [noWhy, ...validPlan.actions] }).success).toBe(false)
  })
})

describe('changeSummarySchema', () => {
  it('acepta un resumen válido', () => {
    expect(changeSummarySchema.safeParse(validChanges).success).toBe(true)
  })

  it('limita el summary a 600 caracteres', () => {
    expect(changeSummarySchema.safeParse({ ...validChanges, summary: 'a'.repeat(601) }).success).toBe(false)
  })

  it('exige de 1 a 5 highlights', () => {
    expect(changeSummarySchema.safeParse({ ...validChanges, highlights: [] }).success).toBe(false)
    expect(changeSummarySchema.safeParse({ ...validChanges, highlights: Array(5).fill('x') }).success).toBe(true)
    expect(changeSummarySchema.safeParse({ ...validChanges, highlights: Array(6).fill('x') }).success).toBe(false)
  })
})
