import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const BASE =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-white'

const VARIANTS = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
  secondary:
    'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
}

type ButtonLinkProps = {
  href: string
  children: ReactNode
  variant?: keyof typeof VARIANTS
  className?: string
}

/** Navigation link that looks like a button (same styles as `SubmitButton`). */
export function ButtonLink({ href, children, variant = 'primary', className }: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant], className)}>
      {children}
    </Link>
  )
}
