'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass, type ButtonVariant } from './button-styles'

type SubmitButtonProps = {
  children: ReactNode
  pendingLabel: string
  variant?: ButtonVariant
  className?: string
  /** Pending state from `useActionState`; defaults to the form's own status (`useFormStatus`). */
  pending?: boolean
  /** The action cannot succeed now (quota, wait); the reason must be visible and linked (D-UX-11). */
  disabled?: boolean
  /** Id of the visible text that explains the limits of the action. */
  describedBy?: string
}

/** Submit button that disables itself and shows progress while its form is pending. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className,
  pending: pendingProp,
  disabled = false,
  describedBy,
}: SubmitButtonProps) {
  const status = useFormStatus()
  const pending = pendingProp ?? status.pending
  const inactive = pending || disabled

  return (
    <button
      type="submit"
      disabled={inactive}
      aria-disabled={inactive}
      aria-describedby={describedBy}
      className={buttonClass(variant, className)}
    >
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
