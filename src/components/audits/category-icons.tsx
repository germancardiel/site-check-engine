import type { ReactNode } from 'react'
import type { CategoryId } from '@/lib/audit/types'
import { cn } from '@/lib/utils'

const CATEGORY_PATHS: Record<CategoryId, ReactNode> = {
  crawl: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13 13 4 4" />
    </>
  ),
  url: (
    <>
      <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L9.5 5.5" />
      <path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1.5-1.5" />
    </>
  ),
  onpage: (
    <>
      <path d="M3 10.5V4h6.5l7.5 7.5-6.5 6.5L3 10.5Z" />
      <circle cx="6.5" cy="6.5" r="1" />
    </>
  ),
  content: (
    <>
      <path d="M5 3h7l4 4v10H5V3Z" />
      <path d="M12 3v4h4M7.5 10h5M7.5 13.5h5" />
    </>
  ),
  schema: (
    <>
      <path d="M7 4c-1.5 0-2 .8-2 2v2c0 1-.8 2-2 2 1.2 0 2 1 2 2v2c0 1.2.5 2 2 2" />
      <path d="M13 4c1.5 0 2 .8 2 2v2c0 1 .8 2 2 2-1.2 0-2 1-2 2v2c0 1.2-.5 2-2 2" />
    </>
  ),
  performance: (
    <>
      <path d="M3.5 14a7 7 0 1 1 13 0" />
      <path d="m10 11 3.5-3.5" />
      <circle cx="10" cy="11" r="1.25" />
    </>
  ),
  mobile: (
    <>
      <rect x="5.5" y="2.5" width="9" height="15" rx="1.75" />
      <path d="M9 14.5h2" />
    </>
  ),
  trust: (
    <>
      <path d="M10 2.5 4 5v4.5c0 4.2 2.6 7.4 6 8.5 3.4-1.1 6-4.3 6-8.5V5l-6-2.5Z" />
      <path d="m7.5 10 1.8 1.8 3.4-3.6" />
    </>
  ),
  international: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14M10 3c2 2.2 2 11.8 0 14M10 3c-2 2.2-2 11.8 0 14" />
    </>
  ),
  ai: (
    <>
      <path d="m10 2.5 1.8 4.7 4.7 1.8-4.7 1.8-1.8 4.7-1.8-4.7-4.7-1.8 4.7-1.8L10 2.5Z" />
      <path d="m15.5 13.5.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </>
  ),
}

export function CategoryIcon({ category, className }: { category: CategoryId; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-5 shrink-0', className)}
    >
      {CATEGORY_PATHS[category]}
    </svg>
  )
}

export function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
    >
      <path d="M8 2.5v7.5m0 0L5 7m3 3 3-3M3 12.5h10" />
    </svg>
  )
}

export function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-3 shrink-0', className)}
    >
      <path d="M6.5 3.5H3.75v8.75h8.75V9.5M9.5 3.5h3v3M7 9l5.5-5.5" />
    </svg>
  )
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
    >
      <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />
    </svg>
  )
}
