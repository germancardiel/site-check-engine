'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'

type SubmitButtonProps = {
  children: ReactNode
  pendingLabel: string
  variant?: 'primary' | 'secondary'
  className?: string
}

const VARIANTS = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
  secondary:
    'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
}

/** Submit button that disables itself and shows progress while its form is pending. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-white',
        'disabled:cursor-not-allowed disabled:opacity-70',
        VARIANTS[variant],
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
