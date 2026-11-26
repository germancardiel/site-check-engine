'use client'

import { unstable_rethrow } from 'next/navigation'
import { useActionState, type Ref } from 'react'
import { generateChanges, generatePlan } from '@/app/(app)/sitios/[siteId]/auditorias/[auditId]/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { ProgressPanel } from '@/components/ui/progress-panel'
import { SubmitButton } from '@/components/ui/submit-button'
import { useFocusActionResult } from '@/components/ui/use-focus-action-result'
import { NETWORK_ERROR, withNetworkFallback } from '@/lib/action-safety'
import { AI_PENDING_HINT } from '@/lib/ai/config'
import { AI_QUOTA_EXHAUSTED_MESSAGE, quotaLabel } from '@/lib/ai/reports'
import type { AiActionState } from '@/lib/validation/ai'

const INITIAL_STATE: AiActionState = {}

// A failed call (network, timeout of the platform) is a recoverable error in the form (D-UX-12).
const onNetworkError = (): AiActionState => ({ error: NETWORK_ERROR })
const ACTIONS = {
  plan: withNetworkFallback<AiActionState>(generatePlan, onNetworkError, unstable_rethrow),
  changes: withNetworkFallback<AiActionState>(generateChanges, onNetworkError, unstable_rethrow),
}

export const LABELS = {
  plan: {
    create: 'Generar plan con IA',
    form: 'Generar plan de acción con IA',
    started: 'Generando el plan de acción con IA.',
    regenerateHint: 'Regenerar sustituye el plan actual y usa 1 generación.',
    heading: '#plan-title',
    steps: ['Checks de la auditoría enviados al modelo', 'Priorizando por impacto y esfuerzo'],
  },
  changes: {
    create: 'Generar resumen con IA',
    form: 'Generar resumen de cambios con IA',
    started: 'Generando el resumen de cambios con IA.',
    regenerateHint: 'Regenerar sustituye el resumen actual y usa 1 generación.',
    heading: '#ai-changes-title',
    steps: ['Cambios entre las dos auditorías enviados al modelo', 'Redactando el resumen'],
  },
} as const

type ReportKind = keyof typeof LABELS

type GenerateReportFormBaseProps = {
  kind: ReportKind
  siteId: string
  auditId: string
  hasReport: boolean
  /** Generations left today; `null` when the counter could not be read (the server still checks it). */
  remaining: number | null
}

type GenerateReportFormViewProps = GenerateReportFormBaseProps & {
  state: AiActionState
  formAction: (formData: FormData) => void
  pending: boolean
  formRef?: Ref<HTMLFormElement>
}

function buttonLabel(kind: ReportKind, state: AiActionState, hasReport: boolean): string {
  // "Reintentar" only when retrying can work: never after the quota error.
  if (state.error && !state.quotaExceeded) return 'Reintentar'
  return hasReport ? 'Regenerar' : LABELS[kind].create
}

/**
 * Button that generates (or regenerates) an AI report. Before pressing it says how many
 * generations are left and what regenerating costs; with none left it is disabled with the reason
 * (D-UX-11). While pending it shows a progress log; errors are recoverable (D-AI-05).
 */
export function GenerateReportFormView(props: GenerateReportFormViewProps) {
  const { kind, siteId, auditId, hasReport, remaining, state, formAction, pending, formRef } = props
  const labels = LABELS[kind]
  // The quota error of the action is already shown (and announced) by `FormFeedback`.
  const quotaError = state.quotaExceeded === true
  const exhausted = quotaError || remaining === 0
  const noteId = `ai-${kind}-note`
  const errorId = `ai-${kind}-error`
  const notes = [
    quotaError ? null : exhausted ? AI_QUOTA_EXHAUSTED_MESSAGE : remaining !== null ? quotaLabel(remaining) : null,
    hasReport && !exhausted ? labels.regenerateHint : null,
  ].filter((note): note is string => note !== null)
  const describedBy = [notes.length > 0 ? noteId : null, quotaError ? errorId : null].filter(Boolean).join(' ')

  return (
    <form ref={formRef} action={formAction} aria-label={labels.form} className="flex flex-col items-start gap-3">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="auditId" value={auditId} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SubmitButton
          pendingLabel="Generando…"
          variant={hasReport ? 'secondary' : 'primary'}
          pending={pending}
          disabled={exhausted}
          describedBy={describedBy || undefined}
        >
          {buttonLabel(kind, state, hasReport)}
        </SubmitButton>
        {notes.length > 0 ? (
          <p id={noteId} className="text-sm text-ink-muted">
            {notes.join(' ')}
          </p>
        ) : null}
      </div>
      {pending ? <ProgressPanel title="Generando con IA" steps={labels.steps} hint={AI_PENDING_HINT} /> : null}
      <FormFeedback
        error={state.error}
        errorId={errorId}
        message={state.message}
        pending={pending ? `${labels.started} ${AI_PENDING_HINT}` : undefined}
      />
    </form>
  )
}

export function GenerateReportForm(props: GenerateReportFormBaseProps) {
  const [state, formAction, pending] = useActionState(ACTIONS[props.kind], INITIAL_STATE)
  // After generating, the focus goes to the heading of the plan or the summary (D-UX-10).
  const formRef = useFocusActionResult<HTMLFormElement>(state, LABELS[props.kind].heading)
  return <GenerateReportFormView {...props} state={state} formAction={formAction} pending={pending} formRef={formRef} />
}
