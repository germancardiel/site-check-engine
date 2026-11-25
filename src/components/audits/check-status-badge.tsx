import { StatusIcon } from '@/components/ui/status-icon'
import { STATUS_LABEL } from '@/lib/audit/present'
import type { CheckStatus } from '@/lib/audit/types'
import { cn } from '@/lib/utils'

const BORDER: Record<CheckStatus, string> = {
  pass: 'border-pass text-ink',
  warn: 'border-warn text-ink',
  fail: 'border-fail text-ink',
  na: 'border-line text-ink-muted',
  error: 'border-line text-ink-muted',
}

/** Check status as a pill: own SVG icon plus text (never color alone). */
export function CheckStatusBadge({ status, className }: { status: CheckStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1.5 font-mono text-[11px] font-medium tracking-wider uppercase',
        BORDER[status],
        className,
      )}
    >
      <StatusIcon status={status} className="size-3.5" />
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Color del número según la nota (0–100), usando tokens de globals.css. */
export function scoreColor(score: number | null): string {
  if (score === null) return 'text-ink-muted'
  if (score >= 75) return 'text-pass'
  if (score >= 50) return 'text-warn'
  return 'text-fail'
}
