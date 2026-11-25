import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BrandLink } from './brand-link'

/** Header of the public pages (landing, auth, not-found): wordmark to `/` and optional links. */
export function PublicHeader({ children, className = 'max-w-landing' }: { children?: ReactNode; className?: string }) {
  return (
    <header className="w-full border-b border-line">
      <div
        className={cn(
          'mx-auto flex min-h-16 w-full flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-3 sm:px-6',
          className,
        )}
      >
        <BrandLink href="/" />
        {children}
      </div>
    </header>
  )
}
