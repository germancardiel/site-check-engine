import type { ReactNode } from 'react'
import { buildChartData, type ChartPoint, type ChartSeriesKey } from '@/lib/audit/chart'
import type { HistoryAudit } from '@/lib/audit/history'

type SeriesStyle = {
  stroke: string
  fill: string
  dash?: string
  marker: (point: Pick<ChartPoint, 'x' | 'y'>) => ReactNode
}

// Each series has its own line style and marker, so the legend does not rely on color.
const SERIES_STYLE: Record<ChartSeriesKey, SeriesStyle> = {
  score: {
    stroke: 'stroke-zinc-900 dark:stroke-zinc-100',
    fill: 'fill-zinc-900 dark:fill-zinc-100',
    marker: ({ x, y }) => <circle cx={x} cy={y} r={4} />,
  },
  seo: {
    stroke: 'stroke-blue-700 dark:stroke-blue-300',
    fill: 'fill-blue-700 dark:fill-blue-300',
    dash: '8 4',
    marker: ({ x, y }) => <rect x={x - 4} y={y - 4} width={8} height={8} />,
  },
  ai: {
    stroke: 'stroke-orange-700 dark:stroke-orange-300',
    fill: 'fill-orange-700 dark:fill-orange-300',
    dash: '2 4',
    marker: ({ x, y }) => <polygon points={`${x},${y - 5} ${x + 5},${y + 4} ${x - 5},${y + 4}`} />,
  },
}

function LegendItem({ seriesKey, label }: { seriesKey: ChartSeriesKey; label: string }) {
  const style = SERIES_STYLE[seriesKey]
  return (
    <li className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-100">
      <svg aria-hidden="true" width="36" height="12" viewBox="0 0 36 12" className="shrink-0">
        <line x1="0" y1="6" x2="36" y2="6" strokeWidth="2" strokeDasharray={style.dash} className={style.stroke} />
        <g className={style.fill}>{style.marker({ x: 18, y: 6 })}</g>
      </svg>
      {label}
    </li>
  )
}

/** Line chart (own SVG, no dependencies) of the total, SEO and IA scores of the `ok` audits. */
export function ScoreChart({ audits }: { audits: HistoryAudit[] }) {
  const data = buildChartData(audits)
  if (!data) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
        Necesitas al menos dos auditorías para ver la evolución.
      </p>
    )
  }

  return (
    <figure className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <svg
        role="img"
        aria-label={data.ariaLabel}
        viewBox={`0 0 ${data.width} ${data.height}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <g aria-hidden="true" className="text-xs">
          {data.yTicks.map((tick) => (
            <g key={tick.value}>
              <line x1={data.plot.left} x2={data.plot.right} y1={tick.y} y2={tick.y} className="stroke-zinc-200 dark:stroke-zinc-800" />
              <text x={data.plot.left - 8} y={tick.y + 4} textAnchor="end" className="fill-zinc-700 dark:fill-zinc-300">
                {tick.value}
              </text>
            </g>
          ))}
          {data.xLabels.map((label) => (
            <text key={label.anchor} x={label.x} y={data.height - 8} textAnchor={label.anchor} className="fill-zinc-700 dark:fill-zinc-300">
              {label.text}
            </text>
          ))}
          {data.series.map((series) => {
            const style = SERIES_STYLE[series.key]
            return (
              <g key={series.key}>
                <polyline points={series.polyline} fill="none" strokeWidth={2} strokeDasharray={style.dash} className={style.stroke} />
                <g className={style.fill}>
                  {series.points.map((point, index) => (
                    <g key={`${series.key}-${index}`}>{style.marker(point)}</g>
                  ))}
                </g>
              </g>
            )
          })}
        </g>
      </svg>
      <figcaption>
        <span className="sr-only">Leyenda:</span>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {data.series.map((series) => (
            <LegendItem key={series.key} seriesKey={series.key} label={series.label} />
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
