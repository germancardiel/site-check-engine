'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { deleteSite } from '@/app/(app)/sitios/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { buttonClass } from '@/components/ui/button-styles'
import { SubmitButton } from '@/components/ui/submit-button'
import type { SiteActionState } from '@/lib/validation/site'

const INITIAL_STATE: SiteActionState = {}

const QUIET_BUTTON = buttonClass('quiet')
const SECONDARY_BUTTON = buttonClass('secondary')

/** Two-step delete: the first click asks for confirmation, the second one deletes. */
export function DeleteSiteForm({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [state, formAction] = useActionState(deleteSite, INITIAL_STATE)
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  const promptId = `delete-${siteId}-prompt`

  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
    else if (wasConfirming.current) triggerRef.current?.focus()
    wasConfirming.current = confirming
  }, [confirming])

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setConfirming(true)}
          className={QUIET_BUTTON}
        >
          Borrar
        </button>
        <FormFeedback error={state.error} />
      </div>
    )
  }

  return (
    <form
      action={formAction}
      role="group"
      aria-labelledby={promptId}
      className="flex flex-col gap-3 rounded-md border border-fail bg-panel p-3"
    >
      <p id={promptId} className="text-sm text-ink">
        ¿Borrar <span className="font-medium break-all">{siteName}</span>? También se borrarán sus
        auditorías.
      </p>
      <input type="hidden" name="id" value={siteId} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Borrando…" variant="danger">
          Sí, borrar
        </SubmitButton>
        <button
          ref={cancelRef}
          type="button"
          onClick={() => setConfirming(false)}
          className={SECONDARY_BUTTON}
        >
          Cancelar
        </button>
      </div>
      <FormFeedback error={state.error} />
    </form>
  )
}
