import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  hint?: string
}

export const INPUT_CLASS =
  'min-h-10 w-full rounded-md border border-line-strong bg-panel px-3 py-2 text-base text-ink transition-colors duration-200 ease-out placeholder:text-ink-muted hover:border-ink focus-visible:border-focus'

/** Text input with an associated `<label>` and an optional hint. */
export function TextField({ id, label, hint, className, ...inputProps }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input id={id} aria-describedby={hintId} className={cn(INPUT_CLASS, className)} {...inputProps} />
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
