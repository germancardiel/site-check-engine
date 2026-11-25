import { cn } from '@/lib/utils'

/** Small right chevron used as a list marker (same stroke as the status icons). */
export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-3.5 shrink-0', className)}
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  )
}
