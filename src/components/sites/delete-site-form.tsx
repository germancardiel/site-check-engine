'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { deleteSite } from '@/app/(app)/sitios/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import type { SiteActionState } from '@/lib/validation/site'

const INITIAL_STATE: SiteActionState = {}

const SECONDARY_BUTTON =
  'inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:outline-white'

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
          className={SECONDARY_BUTTON}
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
      className="flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
    >
      <p id={promptId} className="text-sm text-red-900 dark:text-red-100">
        ¿Borrar <span className="font-medium break-all">{siteName}</span>? También se borrarán sus
        auditorías.
      </p>
      <input type="hidden" name="id" value={siteId} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Borrando…" className="bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:text-white dark:hover:bg-red-700">
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
