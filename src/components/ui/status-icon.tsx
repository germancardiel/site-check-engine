import type { CheckStatus } from '@/lib/audit/types'
import { cn } from '@/lib/utils'

const TONE: Record<CheckStatus, string> = {
  pass: 'text-pass',
  warn: 'text-warn',
  fail: 'text-fail',
  na: 'text-ink-muted',
  error: 'text-ink-muted',
}

/** Own 16px icons with a uniform 1.75px stroke; decorative (the status is always also written). */
export function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', TONE[status], className)}
    >
      {status === 'pass' ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M5.25 8.25 7.1 10l3.65-4" />
        </>
      ) : null}
      {status === 'warn' ? (
        <>
          <path d="M8 1.9 14.6 13.6H1.4Z" />
          <path d="M8 6.4v3.1M8 11.6v.01" />
        </>
      ) : null}
      {status === 'fail' ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="m5.75 5.75 4.5 4.5m0-4.5-4.5 4.5" />
        </>
      ) : null}
      {status === 'na' ? (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M5.25 8h5.5" />
        </>
      ) : null}
      {status === 'error' ? (
        <>
          <circle cx="8" cy="8" r="6.25" strokeDasharray="2.5 2.5" />
          <path d="M8 5.25v3M8 10.75v.01" />
        </>
      ) : null}
    </svg>
  )
}
