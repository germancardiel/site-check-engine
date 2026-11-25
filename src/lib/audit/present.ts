import { formatAbsoluteDate } from '@/lib/format'
import type { AuditStatus } from '@/lib/supabase/types'
import { CATEGORIES, CATEGORY_BY_ID } from './categories'
import type { CheckInfo } from './checks'
import type { AuditDiff } from './diff'
import { buildCategories, isIssue, scoreAudit } from './scoring'
import type { AuditReport, CategoryId, CheckResult, CheckStatus, ScoreLabel } from './types'

/** Presentación compartida por la web y el Markdown. */
export const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: 'Correcto',
  warn: 'Mejorable',
  fail: 'Error',
  na: 'No aplica',
  error: 'No evaluable',
}

/** Text shown next to each status icon, so the status never depends on color alone. */
export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = STATUS_LABEL

export const CHECK_CATEGORY_LABEL: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.shortTitle]),
) as Record<CategoryId, string>

export const LABEL_TONE: Record<ScoreLabel, 'good' | 'ok' | 'warn' | 'bad'> = {
  Excelente: 'good',
  Bueno: 'ok',
  Mejorable: 'warn',
  Deficiente: 'bad',
}

export const STATUS_ORDER: Record<CheckStatus, number> = {
  fail: 0,
  warn: 1,
  pass: 2,
  error: 3,
  na: 4,
}

/** Sorts checks `fail` → `warn` → `pass` → `error` → `na`, keeping the original order within each status. */
export function sortChecks(checks: CheckResult[]): CheckResult[] {
  return [...checks].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

export type CheckGroup = {
  category: CategoryId
  title: string
  /** `fail` first, then `warn`. */
  pending: CheckResult[]
  passed: CheckResult[]
}

/** Groups checks into the 10 categories, each sorted and split into pending and passed. */
export function groupChecks(checks: CheckResult[]): CheckGroup[] {
  return CATEGORIES.map((meta) => {
    const sorted = sortChecks(checks.filter((check) => check.category === meta.id))
    return {
      category: meta.id,
      title: meta.title,
      pending: sorted.filter((check) => isIssue(check.status)),
      passed: sorted.filter((check) => !isIssue(check.status)),
    }
  })
}

export type CheckPriority = {
  /** `fail` first, then `warn`, across all categories. */
  pending: CheckResult[]
  passed: CheckResult[]
}

/** Splits checks into what to fix first (`fail` → `warn`) and the rest. */
export function prioritizeChecks(checks: CheckResult[]): CheckPriority {
  const sorted = sortChecks(checks)
  return {
    pending: sorted.filter((check) => isIssue(check.status)),
    passed: sorted.filter((check) => !isIssue(check.status)),
  }
}

export type CatalogGroup<T extends CheckInfo = CheckInfo> = {
  category: CategoryId
  number: number
  title: string
  shortTitle: string
  weight: number
  checks: T[]
}

/** Splits the check catalog into the 10 category sections, keeping the catalog order. */
export function groupCatalog<T extends CheckInfo>(catalog: T[]): CatalogGroup<T>[] {
  return CATEGORIES.map((meta) => ({
    category: meta.id,
    number: meta.number,
    title: meta.title,
    shortTitle: meta.shortTitle,
    weight: meta.weight,
    checks: catalog.filter((check) => check.category === meta.id),
  })).filter((group) => group.checks.length > 0)
}

/** Construye un `AuditReport` completo a partir de los datos guardados de una auditoría. */
export function buildAuditReport(input: {
  url: string
  createdAt: string
  checks: CheckResult[]
  score?: number | null
  seoScore?: number | null
  aiScore?: number | null
  notices?: string[]
}): AuditReport {
  const categories = buildCategories(input.checks)
  const scored = scoreAudit(categories)
  const score = input.score ?? scored.score
  const seoScore = input.seoScore ?? scored.seoScore
  const aiScore = input.aiScore ?? scored.aiScore
  return {
    finalUrl: input.url,
    auditedAt: input.createdAt,
    score,
    seoScore,
    aiScore,
    label: scored.label,
    capReason: scored.capReason,
    categories,
    issues: scored.issues,
    notices: input.notices ?? [],
  }
}

export function reportToMarkdown(report: AuditReport): string {
  const date = formatAbsoluteDate(report.auditedAt)
  const lines: string[] = [
    `# Auditoría SEO: ${report.finalUrl}`,
    '',
    `**Puntuación global: ${report.score}/100 (${report.label})**  `,
    `Fecha: ${date}  `,
    'Generado con Site Check Engine',
    '',
  ]
  if (report.capReason) lines.push(`> ⚠️ Nota limitada a 40: ${report.capReason}.`, '')
  for (const n of report.notices) lines.push(`> ${n}`, '')

  lines.push('## Resumen por apartado', '', '| Apartado | Nota | Aspectos a mejorar |', '|---|---|---|')
  for (const c of report.categories) {
    const num = CATEGORY_BY_ID[c.id].number
    lines.push(`| ${num}. ${c.title} | ${c.score ?? 'N/A'} | ${c.issues} |`)
  }
  lines.push('')

  if (report.issues.length) {
    lines.push(`## Aspectos a mejorar (${report.issues.length}), por prioridad`, '')
    report.issues.forEach((i, n) =>
      lines.push(`${n + 1}. **${i.title}** (${i.categoryTitle}): ${STATUS_LABEL[i.status]}`),
    )
    lines.push('')
  }

  for (const c of report.categories) {
    const num = CATEGORY_BY_ID[c.id].number
    lines.push(`## ${num}. ${c.title} (${c.score ?? 'N/A'}/100)`, '')
    for (const ch of c.checks) {
      lines.push(`### ${ch.title}: ${STATUS_LABEL[ch.status]}`, '', ch.message)
      if (ch.evidence) lines.push('', `\`${ch.evidence}\``)
      if (ch.items?.length) {
        lines.push('')
        for (const it of ch.items) lines.push(`- ${it.label}${it.value ? `: ${it.value}` : ''}`)
      }
      if (ch.fix && (ch.status === 'warn' || ch.status === 'fail')) {
        lines.push('', '**Cómo arreglarlo:**', '', '```', ch.fix, '```')
      }
      if (ch.docs.length) lines.push('', ch.docs.map((d) => `[${d.label}](${d.url})`).join(' · '))
      lines.push('')
    }
  }
  return lines.join('\n')
}

/** Minimal columns needed to decide which audit to compare against. */
export type ComparisonCandidate = {
  id: string
  site_id: string
  status: AuditStatus
  created_at: string
}

export type ComparisonTarget<T extends ComparisonCandidate> = {
  audit: T
  source: 'requested' | 'previous'
}

function isValidTarget(candidate: ComparisonCandidate | null, current: ComparisonCandidate): boolean {
  return (
    candidate !== null &&
    candidate.id !== current.id &&
    candidate.site_id === current.site_id &&
    candidate.status === 'ok'
  )
}

function isOlder(candidate: ComparisonCandidate, current: ComparisonCandidate): boolean {
  return new Date(candidate.created_at).getTime() < new Date(current.created_at).getTime()
}

/**
 * Picks the audit to compare with: the one requested via `?comparar` when it is an `ok`
 * audit of the same site; otherwise the previous `ok` audit (if any).
 */
export function resolveComparisonTarget<T extends ComparisonCandidate>(
  current: ComparisonCandidate,
  requested: T | null,
  previous: T | null,
): ComparisonTarget<T> | null {
  if (requested && isValidTarget(requested, current)) return { audit: requested, source: 'requested' }
  if (previous && isValidTarget(previous, current) && isOlder(previous, current)) {
    return { audit: previous, source: 'previous' }
  }
  return null
}

/** Whether any check changed status, appeared or disappeared between the two audits. */
export function hasCheckChanges(diff: AuditDiff): boolean {
  return diff.improved.length + diff.regressed.length + diff.added.length + diff.removed.length > 0
}

/** Fragment id of a check in the audit detail page, used by the AI plan to link to it. */
export function checkAnchorId(checkId: string): string {
  return `check-${checkId.replace(/[^A-Za-z0-9_-]/g, '-')}`
}
