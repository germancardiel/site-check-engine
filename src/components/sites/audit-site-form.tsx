'use client'

import { unstable_rethrow } from 'next/navigation'
import { useActionState } from 'react'
import { auditSite } from '@/app/(app)/sitios/actions'
import type { ButtonVariant } from '@/components/ui/button-styles'
import { FormFeedback } from '@/components/ui/form-feedback'
import { ProgressPanel } from '@/components/ui/progress-panel'
import { SubmitButton } from '@/components/ui/submit-button'
import { NETWORK_ERROR, withNetworkFallback } from '@/lib/action-safety'
import { auditBlockReason, auditQuotaLabel, type AuditCooldown } from '@/lib/sites/audit-availability'
import type { SiteActionState } from '@/lib/validation/site'
import { useCountdown } from './use-countdown'

const INITIAL_STATE: SiteActionState = {}

// A failed call (network, server down) is shown in the form, never as `error.tsx` (D-UX-12).
const safeAuditSite = withNetworkFallback<SiteActionState>(auditSite, () => ({ error: NETWORK_ERROR }), unstable_rethrow)

export const AUDIT_PENDING_HINT = 'Suele tardar entre 10 y 60 segundos.'
const AUDIT_STEPS = ['Descargando la página y sus archivos', 'Comprobando los 10 apartados', 'Calculando la nota']

type AuditSiteFormBaseProps = {
  siteId: string
  siteName: string
  label?: string
  variant?: ButtonVariant
  /** Audits the user can still start today; `null` when unknown (the database still enforces it). */
  remaining: number | null
  /** Shows "Te quedan N auditorías hoy." next to the button (the site list shows it once instead). */
  showQuota?: boolean
}

type AuditSiteFormViewProps = AuditSiteFormBaseProps & {
  state: SiteActionState
  formAction: (formData: FormData) => void
  pending: boolean
  /** Seconds until the 1-minute wait between audits of this site ends (0 = can audit). */
  secondsLeft: number
}

/**
 * "Auditar" form: says what limits the action before pressing (quota, wait), disables the button
 * with the reason when it cannot succeed, and shows a progress block while the audit runs. On
 * success the action redirects to the new audit.
 */
export function AuditSiteFormView(props: AuditSiteFormViewProps) {
  const { siteId, siteName, label = 'Auditar', variant = 'secondary', remaining, showQuota = true } = props
  const { state, formAction, pending, secondsLeft } = props
  const blockReason = auditBlockReason(remaining, secondsLeft)
  const noteId = `audit-${siteId}-note`
  const note = blockReason ?? (showQuota && remaining !== null ? auditQuotaLabel(remaining) : null)

  return (
    <form action={formAction} aria-label={`Auditar ${siteName}`} className="flex flex-col gap-2">
      <input type="hidden" name="siteId" value={siteId} />
      <SubmitButton
        pendingLabel="Auditando…"
        variant={variant}
        pending={pending}
        disabled={blockReason !== null}
        describedBy={note ? noteId : undefined}
      >
        {label}
      </SubmitButton>
      {note ? (
        <p id={noteId} className="text-sm text-ink-muted">
          {note}
        </p>
      ) : null}
      {pending ? <ProgressPanel title="Auditando el sitio" steps={AUDIT_STEPS} hint={AUDIT_PENDING_HINT} /> : null}
      <FormFeedback
        error={state.error}
        message={state.message}
        pending={pending ? `Auditando ${siteName}. ${AUDIT_PENDING_HINT}` : undefined}
      />
    </form>
  )
}

type AuditSiteFormProps = AuditSiteFormBaseProps & {
  /** Wait before this site can be audited again, computed on the server; `null` = no wait. */
  cooldown: AuditCooldown
}

export function AuditSiteForm({ cooldown, ...props }: AuditSiteFormProps) {
  const [state, formAction, pending] = useActionState(safeAuditSite, INITIAL_STATE)
  const secondsLeft = useCountdown(cooldown?.availableAt ?? null, cooldown?.secondsLeft ?? 0)
  return <AuditSiteFormView {...props} state={state} formAction={formAction} pending={pending} secondsLeft={secondsLeft} />
}
