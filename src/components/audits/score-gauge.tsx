import { cn } from '@/lib/utils'
import { scoreColor } from './check-status-badge'

/** Indicador circular 0–100 usando exclusivamente tokens de globals.css. */
export function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score))
  const r = 54
  const c = 2 * Math.PI * r
  const tone = scoreColor(clamped)
  return (
    <div
      role="meter"
      aria-label="Puntuación global"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped} de 100`}
      className="relative h-[150px] w-[150px] shrink-0"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-line" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none', tone)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-[2.6rem] font-semibold leading-none tracking-display tabular-nums', tone)}>
          {clamped}
        </span>
        <span className="mt-1 font-mono text-xs text-ink-muted">/100</span>
      </div>
    </div>
  )
}
