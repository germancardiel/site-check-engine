import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StatusIcon } from './status-icon'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  hint?: string
  /** Validation error of this field: shown next to it and linked with `aria-describedby` (D-UX-09). */
  error?: string
  /** Control shown on the same line as the input (e.g. "Mostrar" in a password field). */
  trailing?: ReactNode
}

export const INPUT_CLASS =
  'min-h-10 w-full rounded-md border border-line-strong bg-panel px-3 py-2 text-base text-ink transition-colors duration-200 ease-out placeholder:text-ink-muted hover:border-ink focus-visible:border-focus'

/** Joins the ids of the hint, the error and any `aria-describedby` received, without dropping any. */
function describedBy(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(' ')
  return joined === '' ? undefined : joined
}

/** Text input with an associated `<label>`, an optional hint and an optional error message. */
export function TextField({
  id,
  label,
  hint,
  error,
  trailing,
  className,
  'aria-describedby': ariaDescribedBy,
  ...inputProps
}: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const input = (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(hintId, errorId, ariaDescribedBy)}
      className={cn(INPUT_CLASS, error && 'border-fail', className)}
      {...inputProps}
    />
  )

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {trailing ? (
        <div className="flex min-w-0 items-stretch gap-2">
          {input}
          {trailing}
        </div>
      ) : (
        input
      )}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-ink">
          <StatusIcon status="fail" className="mt-0.5" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
