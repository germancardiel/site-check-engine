import type { CheckResult, CheckStatus } from '@/lib/audit/types'
import type { PromptAudit } from '../prompts'
import type { ActionPlan, ChangeSummary } from '../schemas'

export function makeCheck(id: string, status: CheckStatus, overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    id,
    category: 'seo',
    title: `Título ${id}`,
    status,
    weight: 5,
    message: `Mensaje ${id}.`,
    recommendation: `Recomendación ${id}.`,
    ...overrides,
  }
}

export function makeAudit(checks: CheckResult[], overrides: Partial<PromptAudit> = {}): PromptAudit {
  return { url: 'https://ejemplo.com', score: 62, seoScore: 70, aiScore: 50, checks, ...overrides }
}

export function makeAction(title: string, impact: 'alto' | 'medio' | 'bajo', effort: 'bajo' | 'medio' | 'alto') {
  return { title, why: 'Porque importa.', how: 'Haz esto.', impact, effort, checkIds: ['title'] }
}

export const validPlan: ActionPlan = {
  summary: 'La web necesita mejorar el título y la descripción.',
  actions: [
    makeAction('Mejorar el título', 'alto', 'bajo'),
    makeAction('Añadir descripción', 'medio', 'bajo'),
    makeAction('Crear llms.txt', 'bajo', 'medio'),
  ],
}

export const validChanges: ChangeSummary = {
  summary: 'La nota sube 10 puntos gracias al título.',
  highlights: ['El título ya cumple.'],
}
