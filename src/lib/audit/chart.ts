import { formatShortDate } from '@/lib/format'
import type { HistoryAudit } from './history'

export type ChartSeriesKey = 'score' | 'seo' | 'ai'

export type ChartPoint = { x: number; y: number; value: number; date: string }

export type ChartSeries = {
  key: ChartSeriesKey
  label: string
  points: ChartPoint[]
  /** SVG `points` attribute for a `<polyline>`. */
  polyline: string
}

export type ChartSize = {
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
}

export type ChartData = {
  width: number
  height: number
  series: ChartSeries[]
  /** Horizontal extent of the plot area, for the grid lines. */
  plot: { left: number; right: number }
  yTicks: Array<{ value: number; y: number }>
  xLabels: Array<{ x: number; text: string; anchor: 'start' | 'end' }>
  ariaLabel: string
}

export const CHART_SIZE: ChartSize = {
  width: 600,
  height: 240,
  padding: { top: 16, right: 16, bottom: 32, left: 40 },
}

const Y_TICKS = [0, 25, 50, 75, 100]

type ScoredAudit = { date: string; score: number; seo: number; ai: number }

const SERIES: Array<{ key: ChartSeriesKey; label: string }> = [
  { key: 'score', label: 'Puntuación' },
  { key: 'seo', label: 'SEO' },
  { key: 'ai', label: 'IA' },
]

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/** `ok` audits with all three scores, oldest first. */
function scoredAudits(audits: HistoryAudit[]): ScoredAudit[] {
  const result: ScoredAudit[] = []
  for (const audit of audits) {
    if (audit.status !== 'ok' || audit.score === null) continue
    if (audit.seo_score === null || audit.ai_score === null) continue
    result.push({ date: audit.created_at, score: audit.score, seo: audit.seo_score, ai: audit.ai_score })
  }
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function describe(label: string, values: number[], countText: string): string {
  return `${label} de ${values[0]} a ${values[values.length - 1]}${countText}`
}

/**
 * Scales the `ok` audits into SVG coordinates (0–100 on the y axis, evenly spaced in
 * chronological order on the x axis). Returns `null` with fewer than two `ok` audits.
 */
export function buildChartData(audits: HistoryAudit[], size: ChartSize = CHART_SIZE): ChartData | null {
  const data = scoredAudits(audits)
  if (data.length < 2) return null

  const { width, height, padding } = size
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const xAt = (index: number) => round(padding.left + (index / (data.length - 1)) * innerWidth)
  const yAt = (value: number) => round(padding.top + (1 - clampScore(value) / 100) * innerHeight)

  const series = SERIES.map(({ key, label }) => {
    const points = data.map((audit, index) => ({
      x: xAt(index),
      y: yAt(audit[key]),
      value: audit[key],
      date: audit.date,
    }))
    return { key, label, points, polyline: points.map((p) => `${p.x},${p.y}`).join(' ') }
  })

  const values = (key: ChartSeriesKey) => data.map((audit) => audit[key])
  const ariaLabel = [
    describe('Puntuación', values('score'), ` en ${data.length} auditorías`),
    describe('SEO', values('seo'), ''),
    describe('IA', values('ai'), ''),
  ].join('. ')

  return {
    width,
    height,
    series,
    plot: { left: padding.left, right: width - padding.right },
    yTicks: Y_TICKS.map((value) => ({ value, y: yAt(value) })),
    xLabels: [
      { x: xAt(0), text: formatShortDate(data[0].date), anchor: 'start' },
      { x: xAt(data.length - 1), text: formatShortDate(data[data.length - 1].date), anchor: 'end' },
    ],
    ariaLabel: `${ariaLabel}.`,
  }
}
