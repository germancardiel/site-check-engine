import type { CheckResult } from '@/lib/audit/types'
import { formatAbsoluteDate } from '@/lib/format'
import { SITE_NAME } from '@/lib/brand'
import { EFFORT_LABEL, IMPACT_LABEL, madridDay } from './reports'
import type { ActionPlan, PlanAction } from './schemas'

export type PlanMarkdownMeta = {
  /** URL of the audited site. */
  siteUrl: string
  /** Generation date of the plan (`ai_reports.created_at`). Never the current time (D-QA-08). */
  createdAt: string
  /** Global score of the audit; `null` when it has none. */
  score: number | null
  /** Checks of the audit, used to show the readable title of each `checkIds` entry. */
  checks: Pick<CheckResult, 'id' | 'title'>[]
}

/**
 * Makes a text field safe to place inside the document: collapses line breaks and runs of
 * whitespace into one space (no new headings or lists), and escapes a leading `#`, `-`, `*`,
 * `+` or `>` so the text never opens a heading, list item or quote.
 */
export function escapeMarkdownText(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.replace(/^([#\-*+>])/, '\\$1').replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
}

/** Inline code span for an untrusted id: no backticks and no line breaks. */
function inlineCode(text: string): string {
  return `\`${text.replace(/`/g, '').replace(/\s+/g, ' ').trim()}\``
}

function relatedChecks(checkIds: string[], titles: Map<string, string>): string[] {
  const unique = [...new Set(checkIds.map((id) => id.trim()).filter((id) => id !== ''))]
  return unique.map((id) => {
    const title = titles.get(id)
    return title === undefined ? `- ${inlineCode(id)}` : `- ${escapeMarkdownText(title)} (${inlineCode(id)})`
  })
}

function actionLines(action: PlanAction, index: number, titles: Map<string, string>): string[] {
  const lines = [
    `### ${String(index + 1).padStart(2, '0')}. ${escapeMarkdownText(action.title)}`,
    '',
    `**${IMPACT_LABEL[action.impact]}** · **${EFFORT_LABEL[action.effort]}**`,
    '',
    `**Por qué:** ${escapeMarkdownText(action.why)}`,
    '',
    `**Cómo:** ${escapeMarkdownText(action.how)}`,
    '',
  ]
  const related = relatedChecks(action.checkIds, titles)
  if (related.length > 0) lines.push('**Checks relacionados:**', '', ...related, '')
  return lines
}

/** Converts a stored (already validated) action plan into a Markdown document. */
export function planToMarkdown(plan: ActionPlan, meta: PlanMarkdownMeta): string {
  const titles = new Map(meta.checks.map((check) => [check.id, check.title]))
  const lines = [
    `# Plan de acción — ${escapeMarkdownText(meta.siteUrl)}`,
    '',
    `Generado el ${formatAbsoluteDate(meta.createdAt)}  `,
    `Nota de la auditoría: ${meta.score === null ? 'sin nota' : `${meta.score}/100`}  `,
    `Generado con IA en ${SITE_NAME}`,
    '',
    '## Resumen',
    '',
    escapeMarkdownText(plan.summary),
    '',
    '## Acciones',
    '',
    ...plan.actions.flatMap((action, index) => actionLines(action, index, titles)),
  ]
  return `${lines.join('\n').trimEnd()}\n`
}

/** File name `plan-de-accion-<domain>-<YYYY-MM-DD>.md` (domain without `www.`, Madrid day of `createdAt`). */
export function planFileName(siteUrl: string, createdAt: string): string {
  let domain = 'sitio'
  try {
    domain = new URL(siteUrl).hostname.replace(/^www\./, '') || domain
  } catch {
    // Keep the fallback name when the stored URL cannot be parsed.
  }
  const date = new Date(createdAt)
  const day = Number.isNaN(date.getTime()) ? 'sin-fecha' : madridDay(date)
  return `plan-de-accion-${domain}-${day}.md`
}
