import { StatusIcon } from '@/components/ui/status-icon'
import { CHECK_STATUS_LABEL } from '@/lib/audit/present'
import type { CheckStatus } from '@/lib/audit/types'
import { cn } from '@/lib/utils'

const BORDER: Record<CheckStatus, string> = { pass: 'border-pass', warn: 'border-warn', fail: 'border-fail' }

/** Check status as a pill: own SVG icon plus text (never color alone). */
export function CheckStatusBadge({ status, className }: { status: CheckStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1.5 text-xs font-medium text-ink',
        BORDER[status],
        className,
      )}
    >
      <StatusIcon status={status} className="size-3.5" />
      {CHECK_STATUS_LABEL[status]}
    </span>
  )
}
