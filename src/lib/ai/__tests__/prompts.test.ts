import { describe, expect, it } from 'vitest'
import { diffAudits } from '@/lib/audit/diff'
import type { CheckResult } from '@/lib/audit/types'
import { PROMPT_MAX_CHARS } from '../config'
import {
  buildChangesPrompt,
  buildPlanPrompt,
  clip,
  fitLines,
  omittedNote,
  promptLength,
  type PromptAudit,
} from '../prompts'
import { makeAudit, makeCheck } from './fixtures'

function snapshot(audit: PromptAudit) {
  return { score: audit.score, seoScore: audit.seoScore, aiScore: audit.aiScore, checks: audit.checks }
}

function hugeChecks(count: number, status: CheckResult['status']): CheckResult[] {
  return Array.from({ length: count }, (_, i) =>
    makeCheck(`${status}-${i}`, status, { message: 'm'.repeat(250), recommendation: 'r'.repeat(250) }),
  )
}

describe('buildPlanPrompt', () => {
  const audit = makeAudit([
    makeCheck('ok-check', 'pass'),
    makeCheck('meta-description', 'warn'),
    makeCheck('title', 'fail'),
    makeCheck('llms-txt', 'fail', { category: 'ai' }),
  ])
  const built = buildPlanPrompt(audit)
  const full = `${built.instructions}\n${built.prompt}`

  it('incluye la URL, las notas y los datos de los checks pendientes', () => {
    expect(built.prompt).toContain('https://ejemplo.com')
    expect(built.prompt).toContain('Nota global: 62/100')
    expect(built.prompt).toContain('SEO: 70/100')
    expect(built.prompt).toContain('Visibilidad en IA: 50/100')
    expect(built.prompt).toContain('[title] Título title — estado: fail')
    expect(built.prompt).toContain('Mensaje title.')
    expect(built.prompt).toContain('Recomendación: Recomendación title.')
  })

  it('solo envía los checks fail y warn, con fail primero', () => {
    expect(built.prompt).not.toContain('ok-check')
    const title = built.prompt.indexOf('[title]')
    const llms = built.prompt.indexOf('[llms-txt]')
    const meta = built.prompt.indexOf('[meta-description]')
    expect(title).toBeGreaterThan(-1)
    expect(llms).toBeGreaterThan(title)
    expect(meta).toBeGreaterThan(llms)
  })

  it('instruye a responder en español, priorizar por impacto y esfuerzo y usar los checkIds reales', () => {
    expect(built.instructions).toMatch(/en español/)
    expect(built.instructions).toMatch(/impacto/)
    expect(built.instructions).toMatch(/esfuerzo/)
    expect(built.instructions).toMatch(/checkId real/)
  })

  it('no incluye HTML aunque los checks traigan etiquetas en el texto (solo los campos permitidos)', () => {
    const withExtra = {
      ...makeCheck('title', 'fail'),
      html: '<html><body><script>alert(1)</script></body></html>',
    } as CheckResult
    const result = buildPlanPrompt(makeAudit([withExtra]))
    expect(`${result.instructions}${result.prompt}`).not.toContain('<html')
    expect(`${result.instructions}${result.prompt}`).not.toContain('<script')
    expect(full).not.toMatch(/<\/?[a-z][^>]*>/i)
  })

  it('indica cuando no hay checks pendientes', () => {
    const result = buildPlanPrompt(makeAudit([makeCheck('a', 'pass')], { score: null }))
    expect(result.prompt).toContain('ninguno')
    expect(result.prompt).toContain('sin nota')
  })

  it('trunca un input enorme a 8.000 caracteres o menos quitando primero los warn del final', () => {
    const result = buildPlanPrompt(makeAudit([...hugeChecks(100, 'warn'), ...hugeChecks(100, 'fail')]))
    expect(promptLength(result)).toBeLessThanOrEqual(PROMPT_MAX_CHARS)
    expect(result.prompt).toContain('[fail-0]')
    expect(result.prompt).not.toContain('[warn-')
    expect(result.prompt).toMatch(/\(\d+ checks omitidos\)/)
    const kept = (result.prompt.match(/\[fail-\d+\]/g) ?? []).length
    expect(result.prompt).toContain(omittedNote(200 - kept))
  })

  it('recorta URLs y textos muy largos para que el límite siempre se cumpla', () => {
    const result = buildPlanPrompt(
      makeAudit([makeCheck('x'.repeat(5000), 'fail', { title: 't'.repeat(5000) })], { url: `https://e.com/${'p'.repeat(20000)}` }),
    )
    expect(promptLength(result)).toBeLessThanOrEqual(PROMPT_MAX_CHARS)
  })
})

describe('fitLines (límite exacto)', () => {
  const instructions = 'i'.repeat(100)
  const head = 'h'.repeat(100)
  const tail = 't'.repeat(98)
  const line = 'l'.repeat(99)
  // 100 + 100 + 98 + 1 (head/tail newline) = 299; each line adds 100.

  it('mantiene todas las líneas si el total mide exactamente el máximo', () => {
    const result = fitLines(instructions, head, [line, line], tail, 499)
    expect(promptLength(result)).toBe(499)
    expect(result.prompt).not.toContain('omitidos')
  })

  it('quita líneas y añade la nota si se pasa en un solo carácter', () => {
    const result = fitLines(instructions, head, [line, line], tail, 498)
    expect(promptLength(result)).toBeLessThanOrEqual(498)
    expect(result.prompt).toContain('(1 checks omitidos)')
    expect(result.prompt.split('\n')).toEqual([head, line, '(1 checks omitidos)', tail])
  })

  it('puede omitir todas las líneas', () => {
    const result = fitLines(instructions, head, [line, line], tail, 320)
    expect(result.prompt.split('\n')).toEqual([head, '(2 checks omitidos)', tail])
  })
})

describe('clip', () => {
  it('compacta espacios y corta con puntos suspensivos', () => {
    expect(clip('  a \n b  ')).toBe('a b')
    expect(clip('abcdef', 4)).toBe('abc…')
    expect(clip('abcd', 4)).toBe('abcd')
  })
})

describe('buildChangesPrompt', () => {
  const prev = makeAudit([makeCheck('title', 'fail'), makeCheck('canonical', 'pass'), makeCheck('old', 'warn')], {
    score: 50,
    seoScore: 55,
    aiScore: 45,
  })
  const curr = makeAudit([makeCheck('title', 'pass'), makeCheck('canonical', 'fail'), makeCheck('new-one', 'warn')])
  const diff = diffAudits(snapshot(prev), snapshot(curr))
  const built = buildChangesPrompt(diff, prev, curr)

  it('incluye URL, notas de ambas auditorías y las diferencias', () => {
    expect(built.prompt).toContain('https://ejemplo.com')
    expect(built.prompt).toContain('Auditoría anterior · Nota global: 50/100')
    expect(built.prompt).toContain('Auditoría actual · Nota global: 62/100')
    expect(built.prompt).toContain('nota +12')
  })

  it('lista los checks cambiados con su id, empeorados primero', () => {
    const regressed = built.prompt.indexOf('[canonical]')
    expect(regressed).toBeGreaterThan(-1)
    expect(built.prompt.indexOf('[new-one]')).toBeGreaterThan(regressed)
    expect(built.prompt.indexOf('[title]')).toBeGreaterThan(regressed)
    expect(built.prompt).toContain('[old] Título old — eliminado: warn → ya no se comprueba.')
    expect(built.prompt).toContain('[new-one] Título new-one — nuevo: no existía → warn.')
    expect(built.prompt).toContain('Recomendación: Recomendación canonical.')
  })

  it('instruye a responder en español, priorizar por impacto y esfuerzo y usar los checkIds reales', () => {
    expect(built.instructions).toMatch(/en español/)
    expect(built.instructions).toMatch(/impacto/)
    expect(built.instructions).toMatch(/esfuerzo/)
    expect(built.instructions).toMatch(/checkId real/)
  })

  it('indica cuando no hay cambios y deltas sin datos', () => {
    const same = buildChangesPrompt(diffAudits(snapshot(prev), snapshot(prev)), prev, { ...prev, score: null })
    expect(same.prompt).toContain('ninguno')
    expect(buildChangesPrompt({ ...diff, scoreDelta: null, seoDelta: -3 }, prev, curr).prompt).toContain(
      'nota sin datos · SEO -3',
    )
  })

  it('no supera 8.000 caracteres con un diff enorme', () => {
    const bigPrev = makeAudit(hugeChecks(150, 'pass'))
    const bigCurr = makeAudit(hugeChecks(150, 'pass').map((check) => ({ ...check, status: 'fail' as const })))
    const result = buildChangesPrompt(diffAudits(snapshot(bigPrev), snapshot(bigCurr)), bigPrev, bigCurr)
    expect(promptLength(result)).toBeLessThanOrEqual(PROMPT_MAX_CHARS)
    expect(result.prompt).toMatch(/\(\d+ checks omitidos\)/)
    expect(result.prompt).not.toMatch(/<\/?[a-z][^>]*>/i)
  })
})
