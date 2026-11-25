import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BrandLink } from './brand-link'
import { ThemeToggle } from './theme-toggle'

/** Header of the public pages (landing, auth, not-found): wordmark to `/`, optional links and theme toggle. */
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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
