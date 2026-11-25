import type { AuditContext, CategoryId, CheckDef, CheckOutcome, CheckResult } from '../types'
import { crawlChecks } from './01-crawl'
import { urlChecks } from './02-url'
import { onpageChecks } from './03-onpage'
import { contentChecks } from './04-content'
import { schemaChecks } from './05-schema'
import { performanceChecks } from './06-performance'
import { mobileChecks } from './07-mobile'
import { trustChecks } from './08-trust'
import { internationalChecks } from './09-international'
import { aiChecks } from './10-ai'

export const ALL_CHECKS: CheckDef[] = [
  ...crawlChecks,
  ...urlChecks,
  ...onpageChecks,
  ...contentChecks,
  ...schemaChecks,
  ...performanceChecks,
  ...mobileChecks,
  ...trustChecks,
  ...internationalChecks,
  ...aiChecks,
]

export const CHECK_BY_ID = new Map(ALL_CHECKS.map((def) => [def.id, def]))

/** Readable description of a check, available without running it. */
export type CheckInfo = {
  id: string
  category: CategoryId
  title: string
}

/** Every check of the engine, in `ALL_CHECKS` order (used by the landing and llms.txt). */
export const CHECK_CATALOG: CheckInfo[] = ALL_CHECKS.map(({ id, category, title }) => ({
  id,
  category,
  title,
}))

export function deriveRecommendation(outcome: CheckOutcome): string {
  if (outcome.recommendation) return outcome.recommendation
  if (outcome.status === 'pass') return 'No hace falta ninguna acción.'
  if (outcome.status === 'na') return 'No aplica a esta página.'
  if (outcome.status === 'error') return 'Vuelve a intentarlo cuando el servicio esté disponible.'
  return outcome.fix ?? outcome.message
}

export function runCheckDef(def: CheckDef, ctx: AuditContext): CheckResult {
  let outcome: CheckOutcome
  try {
    outcome = def.run(ctx)
  } catch (error) {
    console.error(`[runChecks] check ${def.id} failed`, error)
    outcome = { status: 'error', message: 'No se ha podido evaluar esta comprobación.' }
  }
  return {
    id: def.id,
    category: def.category,
    title: def.title,
    weight: def.weight,
    docs: def.docs,
    ...outcome,
    recommendation: deriveRecommendation(outcome),
  }
}

export function runChecks(ctx: AuditContext, defs: CheckDef[] = ALL_CHECKS): CheckResult[] {
  return defs.map((def) => runCheckDef(def, ctx))
}

export {
  aiChecks,
  contentChecks,
  crawlChecks,
  internationalChecks,
  mobileChecks,
  onpageChecks,
  performanceChecks,
  schemaChecks,
  trustChecks,
  urlChecks,
}
