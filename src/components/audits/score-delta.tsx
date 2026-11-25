import { formatScoreDelta, type DeltaTrend } from '@/lib/audit/history'
import { cn } from '@/lib/utils'

const TREND_STYLE: Record<DeltaTrend, string> = {
  up: 'text-pass',
  down: 'text-fail',
  same: 'text-ink-muted',
}

function TrendIcon({ trend }: { trend: DeltaTrend }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3 shrink-0"
    >
      {trend === 'up' ? <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" /> : null}
      {trend === 'down' ? <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" /> : null}
      {trend === 'same' ? <path d="M2 4.5h8M2 7.5h8" /> : null}
    </svg>
  )
}

/** Score change with an arrow, a sign and a screen-reader text, so it never relies on color. */
export function ScoreDelta({ delta, className }: { delta: number | null; className?: string }) {
  const formatted = formatScoreDelta(delta)
  if (!formatted) return null

  return (
    <span
      className={cn('inline-flex items-center gap-1 font-mono text-sm tabular-nums', TREND_STYLE[formatted.trend], className)}
    >
      <TrendIcon trend={formatted.trend} />
      <span aria-hidden="true">{formatted.text}</span>
      <span className="sr-only">{formatted.label}</span>
    </span>
  )
}
