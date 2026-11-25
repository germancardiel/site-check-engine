import { describe, expect, it } from 'vitest'
import {
  EFFORT_LABEL,
  IMPACT_LABEL,
  madridDay,
  parseStoredChanges,
  parseStoredPlan,
  quotaLabel,
  readAuditReports,
  remainingGenerations,
  resolveCheckLinks,
  sortActions,
} from '../reports'
import { makeAction, makeCheck, validChanges, validPlan } from './fixtures'

describe('sortActions', () => {
  it('ordena por impacto (alto primero) y, a igual impacto, por esfuerzo (bajo primero)', () => {
    const sorted = sortActions([
      makeAction('bajo-bajo', 'bajo', 'bajo'),
      makeAction('alto-alto', 'alto', 'alto'),
      makeAction('medio-bajo', 'medio', 'bajo'),
      makeAction('alto-bajo', 'alto', 'bajo'),
      makeAction('alto-medio', 'alto', 'medio'),
    ])
    expect(sorted.map((action) => action.title)).toEqual([
      'alto-bajo',
      'alto-medio',
      'alto-alto',
      'medio-bajo',
      'bajo-bajo',
    ])
  })
})

describe('parseStoredPlan / parseStoredChanges', () => {
  it('devuelve el plan validado con las acciones ordenadas', () => {
    const plan = parseStoredPlan({ ...validPlan, actions: [...validPlan.actions].reverse() })
    expect(plan?.actions.map((action) => action.impact)).toEqual(['alto', 'medio', 'bajo'])
  })

  it('devuelve null con contenido inválido en lugar de lanzar', () => {
    expect(parseStoredPlan(null)).toBeNull()
    expect(parseStoredPlan('texto')).toBeNull()
    expect(parseStoredPlan({ summary: 'x', actions: [{ title: 1 }] })).toBeNull()
    expect(parseStoredChanges({ summary: 'x' })).toBeNull()
    expect(parseStoredChanges(validChanges)).toEqual(validChanges)
  })
})

describe('readAuditReports', () => {
  const createdAt = '2026-11-25T10:00:00.000Z'

  it('marca como none los informes que no existen', () => {
    expect(readAuditReports([])).toEqual({ plan: { status: 'none' }, changes: { status: 'none' } })
  })

  it('devuelve los informes válidos con su fecha', () => {
    const reports = readAuditReports([
      { kind: 'plan', content: validPlan, created_at: createdAt },
      { kind: 'changes', content: validChanges, created_at: createdAt },
    ])
    expect(reports.plan).toEqual({ status: 'ok', data: validPlan, createdAt })
    expect(reports.changes).toEqual({ status: 'ok', data: validChanges, createdAt })
  })

  it('un content inválido no rompe la lectura: queda como invalid', () => {
    const reports = readAuditReports([
      { kind: 'plan', content: { roto: true }, created_at: createdAt },
      { kind: 'changes', content: 42, created_at: createdAt },
    ])
    expect(reports).toEqual({ plan: { status: 'invalid' }, changes: { status: 'invalid' } })
  })
})

describe('resolveCheckLinks', () => {
  it('enlaza solo checks existentes, sin repetir', () => {
    const checks = [makeCheck('title', 'fail'), makeCheck('canonical', 'warn')]
    expect(resolveCheckLinks(['title', 'inventado', 'title', 'canonical'], checks)).toEqual([
      { id: 'title', title: 'Título title' },
      { id: 'canonical', title: 'Título canonical' },
    ])
  })
})

describe('madridDay', () => {
  it('usa el día de Europe/Madrid', () => {
    expect(madridDay(new Date('2026-11-25T22:59:59.000Z'))).toBe('2026-11-25')
    expect(madridDay(new Date('2026-11-25T23:00:00.000Z'))).toBe('2026-11-26')
    expect(madridDay(new Date('2026-07-01T21:59:59.000Z'))).toBe('2026-07-01')
    expect(madridDay(new Date('2026-07-01T22:00:00.000Z'))).toBe('2026-07-02')
  })
})

describe('remainingGenerations / quotaLabel', () => {
  it('calcula las generaciones restantes sin bajar de 0', () => {
    expect(remainingGenerations(undefined)).toBe(10)
    expect(remainingGenerations(null)).toBe(10)
    expect(remainingGenerations(3)).toBe(7)
    expect(remainingGenerations(10)).toBe(0)
    expect(remainingGenerations(12)).toBe(0)
    expect(remainingGenerations(-2, 5)).toBe(5)
  })

  it('muestra el texto "Te quedan N generaciones hoy"', () => {
    expect(quotaLabel(7)).toBe('Te quedan 7 generaciones hoy.')
    expect(quotaLabel(0)).toBe('Te quedan 0 generaciones hoy.')
    expect(quotaLabel(1)).toBe('Te queda 1 generación hoy.')
  })

  it('etiqueta impacto y esfuerzo con texto', () => {
    expect(IMPACT_LABEL.alto).toBe('Impacto alto')
    expect(EFFORT_LABEL.bajo).toBe('Esfuerzo bajo')
  })
})
