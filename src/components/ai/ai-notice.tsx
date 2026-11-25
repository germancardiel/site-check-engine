import type { ReactNode } from 'react'
import { StatusIcon } from '@/components/ui/status-icon'

/** Error shown inside an AI section; the rest of the audit stays visible. */
export function AiNotice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md border border-fail px-3 py-2 text-sm text-ink">
      <StatusIcon status="fail" className="mt-0.5" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}
