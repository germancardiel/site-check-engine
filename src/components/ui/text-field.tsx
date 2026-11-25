import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  hint?: string
}

/** Text input with an associated `<label>` and an optional hint. */
export function TextField({ id, label, hint, className, ...inputProps }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={cn(
          'w-full rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900',
          'dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-white',
          className,
        )}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-zinc-600 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
