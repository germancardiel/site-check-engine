import { ALL_CHECKS, CHECK_CATALOG, type CheckInfo } from './audit/checks'
import { scoreChecks } from './audit/scoring'
import type { CategoryId, CheckStatus, Scores } from './audit/types'

/**
 * Fixed example statuses of the landing's sample report (any check not listed passes).
 * It is labelled as an example: these are not the results of a real audit.
 */
export const SPECIMEN_STATUS: Readonly<Record<string, CheckStatus>> = {
  'onpage.description': 'warn',
  'content.alt': 'warn',
  'onpage.og': 'fail',
  'ai.llms': 'warn',
  'schema.identity': 'warn',
  'ai.webmcp': 'fail',
}

export type SpecimenRow = { id: string; title: string; category: CategoryId; status: CheckStatus }

export type Specimen = { rows: SpecimenRow[] } & Scores

const WEIGHTS = new Map(ALL_CHECKS.map((def) => [def.id, def.weight]))

/** Sample report: every catalog check with its example status, and the scores they produce. */
export function buildSpecimen(
  catalog: CheckInfo[] = CHECK_CATALOG,
  statuses: Readonly<Record<string, CheckStatus>> = SPECIMEN_STATUS,
): Specimen {
  const rows = catalog.map((check) => ({ ...check, status: statuses[check.id] ?? 'pass' }))
  const scores = scoreChecks(rows.map((row) => ({ ...row, weight: WEIGHTS.get(row.id) ?? 1 })))
  return { rows, ...scores }
}
