'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass, type ButtonVariant } from './button-styles'

type SubmitButtonProps = {
  children: ReactNode
  pendingLabel: string
  variant?: ButtonVariant
  className?: string
}

/** Submit button that disables itself and shows progress while its form is pending. */
export function SubmitButton({ children, pendingLabel, variant = 'primary', className }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={buttonClass(variant, className)}>
      {pending ? (
        <>
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}
