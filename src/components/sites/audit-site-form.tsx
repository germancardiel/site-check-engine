'use client'

import { useActionState } from 'react'
import { auditSite } from '@/app/(app)/sitios/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import type { SiteActionState } from '@/lib/validation/site'

const INITIAL_STATE: SiteActionState = {}

export function AuditSiteForm({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [state, formAction] = useActionState(auditSite, INITIAL_STATE)

  return (
    <form action={formAction} aria-label={`Auditar ${siteName}`} className="flex flex-col gap-2">
      <input type="hidden" name="siteId" value={siteId} />
      <SubmitButton pendingLabel="Auditando…">Auditar</SubmitButton>
      <FormFeedback error={state.error} message={state.message} />
    </form>
  )
}
