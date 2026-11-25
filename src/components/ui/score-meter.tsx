import { cn } from '@/lib/utils'

type ScoreMeterProps = {
  label: string
  value: number | null
  /** `accent` is reserved for the total score. */
  tone?: 'accent' | 'ink'
  size?: 'sm' | 'lg'
  className?: string
}

/** Score (0–100) as a mono figure plus a linear meter; `–` and no meter when there is no score. */
export function ScoreMeter({ label, value, tone = 'ink', size = 'sm', className }: ScoreMeterProps) {
  const large = size === 'lg'
  const clamped = value === null ? null : Math.min(100, Math.max(0, value))

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn('text-ink-muted', large ? 'text-sm' : 'text-xs')}>{label}</span>
        <span className={cn('font-mono tabular-nums leading-none text-ink', large ? 'text-3xl font-medium' : 'text-sm')}>
          {clamped ?? '–'}
          <span className={cn('text-ink-muted', large ? 'text-base' : 'text-xs')}>/100</span>
        </span>
      </div>
      {clamped === null ? (
        <div aria-hidden="true" className="h-1 rounded-full bg-line" />
      ) : (
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clamped}
          aria-valuetext={`${clamped} de 100`}
          className={cn('overflow-hidden rounded-full bg-line', large ? 'h-1.5' : 'h-1')}
        >
          <div
            className={cn('h-full rounded-full', tone === 'accent' ? 'bg-accent-text' : 'bg-ink-muted')}
            style={{ width: `${clamped}%` }}
          />
        </div>
      )}
    </div>
  )
}
