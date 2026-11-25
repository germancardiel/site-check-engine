import type { ReactNode } from 'react'
import { BrandLink } from './brand-link'

/** Header of the public pages (landing, auth, not-found): wordmark to `/` and optional links. */
export function PublicHeader({ children, className = 'max-w-5xl' }: { children?: ReactNode; className?: string }) {
  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800">
      <div className={`mx-auto flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 ${className}`}>
        <BrandLink href="/" />
        {children}
      </div>
    </header>
  )
}
