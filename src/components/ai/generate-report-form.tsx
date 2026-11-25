'use client'

import { useActionState } from 'react'
import { generateChanges, generatePlan } from '@/app/(app)/sitios/[siteId]/auditorias/[auditId]/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import type { AiActionState } from '@/lib/validation/ai'

const INITIAL_STATE: AiActionState = {}

const ACTIONS = { plan: generatePlan, changes: generateChanges }

const LABELS = {
  plan: { create: 'Generar plan con IA', regenerate: 'Regenerar', form: 'Generar plan de acción con IA' },
  changes: { create: 'Generar resumen con IA', regenerate: 'Regenerar', form: 'Generar resumen de cambios con IA' },
}

type GenerateReportFormProps = {
  kind: 'plan' | 'changes'
  siteId: string
  auditId: string
  hasReport: boolean
}

/** Button that generates (or regenerates) an AI report; shows progress and a retryable error. */
export function GenerateReportForm({ kind, siteId, auditId, hasReport }: GenerateReportFormProps) {
  const [state, formAction] = useActionState(ACTIONS[kind], INITIAL_STATE)
  const labels = LABELS[kind]
  const label = state.error ? 'Reintentar' : hasReport ? labels.regenerate : labels.create

  return (
    <form action={formAction} aria-label={labels.form} className="flex flex-col items-start gap-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="auditId" value={auditId} />
      <SubmitButton pendingLabel="Generando…" variant={hasReport ? 'secondary' : 'primary'}>
        {label}
      </SubmitButton>
      <FormFeedback error={state.error} message={state.message} />
    </form>
  )
}
