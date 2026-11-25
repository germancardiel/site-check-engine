'use client'

import { useEffect, useState } from 'react'
import { ChevronIcon } from '@/components/ui/chevron-icon'
import { formatElapsed } from '@/lib/format'

/**
 * Progress log while an AI report is generated: elapsed time (mm:ss) and the expected wait.
 * Mounted only while pending, so every generation starts at 00:00. The clock is not announced:
 * the parent's live region announces only the start and the end.
 */
export function AiProgress({ steps }: { steps: readonly string[] }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const timer = window.setInterval(() => setElapsed(Date.now() - start), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="w-full max-w-xl rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-ink-muted motion-reduce:animate-none" />
          Generando con IA
        </span>
        <span aria-hidden="true" className="font-mono text-sm text-ink tabular-nums">
          {formatElapsed(elapsed)}
        </span>
      </div>
      <ol aria-hidden="true" className="flex flex-col gap-1.5 px-4 py-3 font-mono text-xs text-ink-muted">
        {steps.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <ChevronIcon className="mt-px text-ink" />
            {step}
          </li>
        ))}
      </ol>
      <p className="border-t border-line px-4 py-2.5 text-sm text-ink-muted">Puede tardar uno o dos minutos.</p>
    </div>
  )
}
