import type { ReactNode } from 'react'

/** Error shown inside an AI section; the rest of the audit stays visible. */
export function AiNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      {children}
    </p>
  )
}
