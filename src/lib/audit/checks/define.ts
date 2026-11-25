import type { AuditContext, Check, CheckCategory, CheckResult, CheckStatus } from '../types'

export type CheckMeta = {
  id: string
  category: CheckCategory
  title: string
  weight: number
  recommendation: string
}

export type Evaluation = { status: CheckStatus; message: string; recommendation?: string }

/** Builds a pure check from its metadata and an evaluation function. */
export function defineCheck(meta: CheckMeta, evaluate: (ctx: AuditContext) => Evaluation): Check {
  return (ctx: AuditContext): CheckResult => {
    const { status, message, recommendation } = evaluate(ctx)
    return {
      id: meta.id,
      category: meta.category,
      title: meta.title,
      status,
      weight: meta.weight,
      message,
      recommendation: status === 'pass' ? 'No hace falta ninguna acción.' : (recommendation ?? meta.recommendation),
    }
  }
}

/** Returns `pass` inside [min, max], `warn` outside and `fail` when the value is missing. */
export function lengthStatus(length: number, min: number, max: number): CheckStatus {
  if (length === 0) return 'fail'
  return length >= min && length <= max ? 'pass' : 'warn'
}
