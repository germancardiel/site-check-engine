import { CHECK_STATUS_LABEL } from '@/lib/audit/present'
import type { CheckStatus } from '@/lib/audit/types'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<CheckStatus, { icon: string; className: string }> = {
  fail: {
    icon: '✕',
    className: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  },
  warn: {
    icon: '!',
    className: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  pass: {
    icon: '✓',
    className: 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  },
}

/** Check status shown as an icon plus text (never color alone). */
export function CheckStatusBadge({ status, className }: { status: CheckStatus; className?: string }) {
  const style = STATUS_STYLE[status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        style.className,
        className,
      )}
    >
      <span aria-hidden="true">{style.icon}</span>
      {CHECK_STATUS_LABEL[status]}
    </span>
  )
}
