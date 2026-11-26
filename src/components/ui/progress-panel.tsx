'use client'

import { useEffect, useState } from 'react'
import { ChevronIcon } from '@/components/ui/chevron-icon'
import { formatElapsed } from '@/lib/format'

type ProgressPanelProps = {
  title: string
  steps: readonly string[]
  /** Expected wait, e.g. "Suele tardar entre 10 y 60 segundos." */
  hint: string
}

/**
 * Progress log of a slow action (audit, AI): elapsed time (mm:ss), the steps and the expected wait.
 * Mounted only while pending, so every run starts at 00:00. Nothing here is announced: the form's
 * single `role="status"` announces the start and the end (D-UX-10).
 */
export function ProgressPanel({ title, steps, hint }: ProgressPanelProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const timer = window.setInterval(() => setElapsed(Date.now() - start), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="w-full max-w-xl rounded-md border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-ink-muted motion-reduce:animate-none" />
          {title}
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
      <p className="border-t border-line px-4 py-2.5 text-sm text-ink-muted">{hint}</p>
    </div>
  )
}
