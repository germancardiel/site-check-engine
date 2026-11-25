'use client'

import { useActionState } from 'react'
import { generateChanges, generatePlan } from '@/app/(app)/sitios/[siteId]/auditorias/[auditId]/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { AI_PENDING_HINT } from '@/lib/ai/config'
import type { AiActionState } from '@/lib/validation/ai'
import { AiProgress } from './ai-progress'

const INITIAL_STATE: AiActionState = {}

const ACTIONS = { plan: generatePlan, changes: generateChanges }

const LABELS = {
  plan: {
    create: 'Generar plan con IA',
    regenerate: 'Regenerar',
    form: 'Generar plan de acción con IA',
    started: 'Generando el plan de acción con IA.',
    steps: ['Checks de la auditoría enviados al modelo', 'Priorizando por impacto y esfuerzo'],
  },
  changes: {
    create: 'Generar resumen con IA',
    regenerate: 'Regenerar',
    form: 'Generar resumen de cambios con IA',
    started: 'Generando el resumen de cambios con IA.',
    steps: ['Cambios entre las dos auditorías enviados al modelo', 'Redactando el resumen'],
  },
} as const

type GenerateReportFormProps = {
  kind: 'plan' | 'changes'
  siteId: string
  auditId: string
  hasReport: boolean
}

/** Button that generates (or regenerates) an AI report; shows a progress log and a retryable error. */
export function GenerateReportForm({ kind, siteId, auditId, hasReport }: GenerateReportFormProps) {
  const [state, formAction, isPending] = useActionState(ACTIONS[kind], INITIAL_STATE)
  const labels = LABELS[kind]
  const label = state.error ? 'Reintentar' : hasReport ? labels.regenerate : labels.create

  return (
    <form action={formAction} aria-label={labels.form} className="flex flex-col items-start gap-3">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="auditId" value={auditId} />
      <SubmitButton pendingLabel="Generando…" variant={hasReport ? 'secondary' : 'primary'}>
        {label}
      </SubmitButton>
      <p role="status" aria-live="polite" className="sr-only">
        {isPending ? `${labels.started} ${AI_PENDING_HINT}` : null}
      </p>
      {isPending ? <AiProgress steps={labels.steps} /> : null}
      <FormFeedback error={state.error} message={state.message} />
    </form>
  )
}
