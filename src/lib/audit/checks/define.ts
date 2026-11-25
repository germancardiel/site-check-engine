import type { AuditContext, Check, CheckCategory, CheckResult, CheckStatus } from '../types'

export type CheckMeta = {
  id: string
  category: CheckCategory
  title: string
  weight: number
  recommendation: string
}

export type Evaluation = { status: CheckStatus; message: string; recommendation?: string }

/** A check that also exposes its metadata, so it can be listed without running it. */
export type DefinedCheck = Check & { readonly meta: CheckMeta }

/** Builds a pure check from its metadata and an evaluation function. */
export function defineCheck(meta: CheckMeta, evaluate: (ctx: AuditContext) => Evaluation): DefinedCheck {
  const check = (ctx: AuditContext): CheckResult => {
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
  return Object.assign(check, { meta })
}

/** Returns `pass` inside [min, max], `warn` outside and `fail` when the value is missing. */
export function lengthStatus(length: number, min: number, max: number): CheckStatus {
  if (length === 0) return 'fail'
  return length >= min && length <= max ? 'pass' : 'warn'
}
