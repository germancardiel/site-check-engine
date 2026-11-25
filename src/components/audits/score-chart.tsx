import type { ReactNode } from 'react'
import { buildChartData, type ChartData, type ChartPoint, type ChartSeriesKey } from '@/lib/audit/chart'
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
    stroke: 'stroke-accent-text',
    fill: 'fill-accent-text',
    marker: ({ x, y }) => <circle cx={x} cy={y} r={4} />,
  },
  seo: {
    stroke: 'stroke-ink',
    fill: 'fill-ink',
    dash: '8 4',
    marker: ({ x, y }) => <rect x={x - 4} y={y - 4} width={8} height={8} />,
  },
  ai: {
    stroke: 'stroke-ink-muted',
    fill: 'fill-ink-muted',
    dash: '1 4',
    marker: ({ x, y }) => <polygon points={`${x},${y - 5} ${x + 5},${y + 4} ${x - 5},${y + 4}`} />,
  },
}

function LegendItem({ seriesKey, label }: { seriesKey: ChartSeriesKey; label: string }) {
  const style = SERIES_STYLE[seriesKey]
  return (
    <li className="flex items-center gap-2 text-sm text-ink">
      <svg aria-hidden="true" width="36" height="12" viewBox="0 0 36 12" className="shrink-0">
        <line x1="0" y1="6" x2="36" y2="6" strokeWidth="2" strokeLinecap="round" strokeDasharray={style.dash} className={style.stroke} />
        <g className={style.fill}>{style.marker({ x: 18, y: 6 })}</g>
      </svg>
      {label}
    </li>
  )
}

/** Grid, axis labels and the three series of the chart. */
function ChartPlot({ data }: { data: ChartData }) {
  return (
    <svg
      role="img"
      aria-label={data.ariaLabel}
      viewBox={`0 0 ${data.width} ${data.height}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <g aria-hidden="true" className="font-mono text-[11px]">
        {data.yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={data.plot.left} x2={data.plot.right} y1={tick.y} y2={tick.y} className="stroke-line" />
            <text x={data.plot.left - 8} y={tick.y + 4} textAnchor="end" className="fill-ink-muted">
              {tick.value}
            </text>
          </g>
        ))}
        {data.xLabels.map((label) => (
          <text key={label.anchor} x={label.x} y={data.height - 8} textAnchor={label.anchor} className="fill-ink-muted">
            {label.text}
          </text>
        ))}
        {data.series.map((series) => {
          const style = SERIES_STYLE[series.key]
          return (
            <g key={series.key}>
              <polyline
                points={series.polyline}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={style.dash}
                className={style.stroke}
              />
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
  )
}

/** Line chart (own SVG, no dependencies) of the total, SEO and IA scores of the `ok` audits. */
export function ScoreChart({ audits }: { audits: HistoryAudit[] }) {
  const data = buildChartData(audits)
  if (!data) {
    return (
      <p className="rounded-md border border-line p-6 text-ink-muted">
        Necesitas al menos dos auditorías para ver la evolución. Vuelve a auditar el sitio después de hacer cambios
        y aquí verás cómo se mueven las notas.
      </p>
    )
  }

  return (
    <figure className="flex flex-col gap-4 rounded-md border border-line bg-panel p-4 sm:p-5">
      <ChartPlot data={data} />
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
