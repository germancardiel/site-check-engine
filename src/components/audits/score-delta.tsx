import { formatScoreDelta, type DeltaTrend } from '@/lib/audit/history'
import { cn } from '@/lib/utils'

const TREND_STYLE: Record<DeltaTrend, { icon: string; className: string }> = {
  up: { icon: '▲', className: 'text-green-800 dark:text-green-300' },
  down: { icon: '▼', className: 'text-red-800 dark:text-red-300' },
  same: { icon: '=', className: 'text-zinc-700 dark:text-zinc-300' },
}

/** Score change with an arrow, a sign and a screen-reader text, so it never relies on color. */
export function ScoreDelta({ delta, className }: { delta: number | null; className?: string }) {
  const formatted = formatScoreDelta(delta)
  if (!formatted) return null
  const style = TREND_STYLE[formatted.trend]

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', style.className, className)}>
      <span aria-hidden="true">
        {style.icon} {formatted.text}
      </span>
      <span className="sr-only">{formatted.label}</span>
    </span>
  )
}
